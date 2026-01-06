"""
Rule Manager Service - Runtime rule reloading without downtime
Handles hot-reloading of fraud rules with validation, versioning, and rollback
"""

import os
import yaml
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import logging

from app.services.redis_stream import get_redis_stream_manager
from app.core.logging import logger, log_event

redis_manager = get_redis_stream_manager()


class RuleManager:
    """Manages runtime rule reloading with versioning and validation"""
    
    def __init__(self, rules_path: str = "/app/rules/fraud_rules.yaml"):
        self.rules_path = rules_path
        self.rules_dir = os.path.dirname(rules_path)
        self.current_rules = None
        self.current_version = None
        self.rule_history = {}  # Track rule versions
        
        # Load initial rules
        self.reload_rules()
    
    # ===== CORE RELOAD FUNCTIONALITY =====
    
    def reload_rules(self, force: bool = False) -> Dict[str, Any]:
        """
        Reload rules from YAML file with validation
        
        Args:
            force: Force reload even if hash hasn't changed
            
        Returns:
            Status dict with version info and changes
        """
        try:
            # Read rules file
            with open(self.rules_path, 'r') as f:
                raw_rules = yaml.safe_load(f) or {}
            
            # Calculate hash to detect changes
            rules_json = json.dumps(raw_rules, sort_keys=True)
            new_hash = hashlib.sha256(rules_json.encode()).hexdigest()
            
            # Check if rules have changed
            if not force and self.current_version and new_hash == self.current_version["hash"]:
                return {
                    "status": "unchanged",
                    "current_version": self.current_version["version"],
                    "hash": new_hash
                }
            
            # Validate rules before applying
            validation = self._validate_rules(raw_rules)
            if not validation["valid"]:
                logger.error(f"Rule validation failed: {validation['errors']}")
                return {
                    "status": "validation_failed",
                    "errors": validation["errors"]
                }
            
            # Generate new version
            new_version = self._generate_version()
            
            # Store old version in history (for rollback)
            if self.current_version:
                self.rule_history[self.current_version["version"]] = {
                    "rules": self.current_rules,
                    "hash": self.current_version["hash"],
                    "timestamp": self.current_version["timestamp"]
                }
            
            # Update current rules
            old_rules = self.current_rules
            self.current_rules = raw_rules
            self.current_version = {
                "version": new_version,
                "hash": new_hash,
                "timestamp": datetime.utcnow().isoformat(),
                "file_path": self.rules_path
            }
            
            # Store in Redis for other instances
            self._store_rules_in_redis(new_version, raw_rules)
            
            # Calculate and log changes
            changes = self._calculate_rule_changes(old_rules or {}, raw_rules)
            
            logger.info(f"Rules reloaded: version {new_version}", extra={
                "rule_version": new_version,
                "hash": new_hash,
                "rules_modified": changes["modified"],
                "rules_added": changes["added"],
                "rules_removed": changes["removed"]
            })
            
            return {
                "status": "success",
                "version": new_version,
                "hash": new_hash,
                "timestamp": self.current_version["timestamp"],
                "changes": changes,
                "rule_count": len(raw_rules.get("rules", []))
            }
        
        except FileNotFoundError:
            logger.error(f"Rules file not found: {self.rules_path}")
            return {
                "status": "error",
                "error": f"Rules file not found: {self.rules_path}"
            }
        
        except yaml.YAMLError as e:
            logger.error(f"Invalid YAML in rules file: {str(e)}")
            return {
                "status": "error",
                "error": f"Invalid YAML: {str(e)}"
            }
        
        except Exception as e:
            logger.error(f"Error reloading rules: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    # ===== VALIDATION =====
    
    def _validate_rules(self, rules: Dict) -> Dict[str, Any]:
        """
        Validate rule structure and content
        
        Returns:
            {"valid": bool, "errors": [list of error strings]}
        """
        errors = []
        
        # Check required sections
        required_sections = ["scoring", "rules", "gates"]
        for section in required_sections:
            if section not in rules:
                errors.append(f"Missing required section: {section}")
        
        # Validate scoring config
        scoring = rules.get("scoring", {})
        required_score_fields = ["base_risk", "velocity_weight", "behavioral_weight"]
        for field in required_score_fields:
            if field not in scoring:
                errors.append(f"Missing scoring field: {field}")
            elif not isinstance(scoring[field], (int, float)):
                errors.append(f"Invalid scoring field type: {field}")
        
        # Validate rules
        rules_list = rules.get("rules", [])
        for i, rule in enumerate(rules_list):
            # Check required rule fields
            if "name" not in rule:
                errors.append(f"Rule {i}: Missing 'name'")
            if "type" not in rule:
                errors.append(f"Rule {i}: Missing 'type'")
            if "score" not in rule:
                errors.append(f"Rule {i}: Missing 'score'")
            
            # Validate score is numeric
            if "score" in rule and not isinstance(rule["score"], (int, float)):
                errors.append(f"Rule {rule.get('name', i)}: Invalid score type")
            
            # Validate type
            valid_types = ["hard", "velocity", "behavioral", "behavioral_ml"]
            if "type" in rule and rule["type"] not in valid_types:
                errors.append(f"Rule {rule.get('name', i)}: Invalid type '{rule['type']}'")
            
            # Validate conditions if present
            if "conditions" in rule and not isinstance(rule["conditions"], dict):
                errors.append(f"Rule {rule.get('name', i)}: Conditions must be a dict")
        
        # Validate gates (hard rules)
        gates = rules.get("gates", [])
        for gate in gates:
            if "conditions" not in gate:
                errors.append(f"Gate: Missing conditions")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    # ===== VERSIONING & HISTORY =====
    
    def _generate_version(self) -> str:
        """Generate semantic version for rules"""
        if not self.current_version:
            return "1.0.0"
        
        # Increment patch version (simple increment)
        parts = self.current_version["version"].split(".")
        try:
            major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
            patch += 1
            return f"{major}.{minor}.{patch}"
        except:
            return "1.0.0"
    
    def get_rule_history(self) -> Dict[str, Any]:
        """Get all rule versions with timestamps"""
        history = {
            "current": self.current_version,
            "history": self.rule_history
        }
        return history
    
    def rollback_rules(self, version: str) -> Dict[str, Any]:
        """
        Rollback to a previous rule version
        
        Args:
            version: Version string to rollback to
            
        Returns:
            Status of rollback operation
        """
        if version not in self.rule_history:
            return {
                "status": "error",
                "error": f"Version {version} not found in history"
            }
        
        try:
            # Get previous version data
            prev_data = self.rule_history[version]
            
            # Restore rules
            old_current = self.current_rules
            self.current_rules = prev_data["rules"]
            
            # Update version tracking
            old_version = self.current_version
            self.current_version = {
                "version": version,
                "hash": prev_data["hash"],
                "timestamp": datetime.utcnow().isoformat(),
                "rolled_back_from": old_version["version"]
            }
            
            # Store in Redis
            self._store_rules_in_redis(version, prev_data["rules"])
            
            logger.warning(f"Rules rolled back to version {version}", extra={
                "from_version": old_version["version"],
                "to_version": version
            })
            
            return {
                "status": "success",
                "rolled_back_to": version,
                "from_version": old_version["version"],
                "timestamp": self.current_version["timestamp"]
            }
        
        except Exception as e:
            logger.error(f"Error rolling back rules: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    # ===== REDIS DISTRIBUTION =====
    
    def _store_rules_in_redis(self, version: str, rules: Dict):
        """
        Store rules in Redis for distributed access
        All instances read from Redis for consistency
        """
        try:
            # Store rules JSON
            rules_json = json.dumps(rules)
            redis_manager.redis.set(
                f"rules:version:{version}",
                rules_json,
                ex=86400*30  # 30 day TTL
            )
            
            # Set current rules pointer
            redis_manager.redis.set(
                "rules:current_version",
                version,
                ex=86400*30
            )
            
            # Publish reload event for other instances
            redis_manager.redis.publish(
                "rule_reload",
                json.dumps({
                    "version": version,
                    "timestamp": datetime.utcnow().isoformat(),
                    "hash": self.current_version["hash"]
                })
            )
        
        except Exception as e:
            logger.error(f"Error storing rules in Redis: {str(e)}")
    
    def load_rules_from_redis(self, version: Optional[str] = None) -> Dict[str, Any]:
        """
        Load rules from Redis (useful for multi-instance consistency)
        
        Args:
            version: Specific version to load, or None for current
        """
        try:
            if not version:
                version = redis_manager.redis.get("rules:current_version")
                if not version:
                    return {"status": "error", "error": "No current version in Redis"}
                version = version.decode() if isinstance(version, bytes) else version
            
            rules_json = redis_manager.redis.get(f"rules:version:{version}")
            if not rules_json:
                return {"status": "error", "error": f"Version {version} not found in Redis"}
            
            rules = json.loads(rules_json.decode() if isinstance(rules_json, bytes) else rules_json)
            
            # Update local copy
            self.current_rules = rules
            self.current_version = {"version": version}
            
            logger.info(f"Rules loaded from Redis: version {version}")
            
            return {
                "status": "success",
                "version": version,
                "rule_count": len(rules.get("rules", []))
            }
        
        except Exception as e:
            logger.error(f"Error loading rules from Redis: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    # ===== CHANGE DETECTION =====
    
    def _calculate_rule_changes(self, old_rules: Dict, new_rules: Dict) -> Dict[str, Any]:
        """
        Calculate what changed between rule versions
        """
        old_rule_names = {r.get("name") for r in old_rules.get("rules", [])}
        new_rule_names = {r.get("name") for r in new_rules.get("rules", [])}
        
        added = new_rule_names - old_rule_names
        removed = old_rule_names - new_rule_names
        modified = []
        
        # Check for modifications in common rules
        for rule in new_rules.get("rules", []):
            rule_name = rule.get("name")
            if rule_name in (old_rule_names & new_rule_names):
                # Find old version
                old_rule = next(
                    (r for r in old_rules.get("rules", []) if r.get("name") == rule_name),
                    None
                )
                if old_rule and old_rule != rule:
                    modified.append(rule_name)
        
        return {
            "added": list(added),
            "removed": list(removed),
            "modified": modified,
            "total_changes": len(added) + len(removed) + len(modified)
        }
    
    # ===== RULE ACCESS =====
    
    def get_rules(self) -> Dict:
        """Get current rules"""
        return self.current_rules or {}
    
    def get_rule_version(self) -> Optional[str]:
        """Get current rule version"""
        return self.current_version["version"] if self.current_version else None
    
    def get_rule_stats(self) -> Dict[str, Any]:
        """Get statistics about current rules"""
        if not self.current_rules:
            return {}
        
        rules = self.current_rules.get("rules", [])
        
        # Count by type
        by_type = {}
        for rule in rules:
            rule_type = rule.get("type", "unknown")
            by_type[rule_type] = by_type.get(rule_type, 0) + 1
        
        # Get scoring config
        scoring = self.current_rules.get("scoring", {})
        
        return {
            "version": self.get_rule_version(),
            "total_rules": len(rules),
            "rules_by_type": by_type,
            "hard_gates": len(self.current_rules.get("gates", [])),
            "scoring_config": scoring,
            "last_updated": self.current_version.get("timestamp") if self.current_version else None
        }


# Singleton instance
_rule_manager = None


def get_rule_manager(rules_path: str = "/app/rules/fraud_rules.yaml") -> RuleManager:
    """Get or create singleton rule manager"""
    global _rule_manager
    if _rule_manager is None:
        _rule_manager = RuleManager(rules_path)
    return _rule_manager
