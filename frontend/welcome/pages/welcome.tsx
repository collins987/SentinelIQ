import React, { useState } from 'react';
import Head from 'next/head';
import styles from '@/components/WelcomePage.module.css';

export default function Welcome() {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  // KEEP EXACT SAME ROUTING LOGIC
  const handleRoleSelect = (role: string) => {
    const portMap: { [key: string]: string } = {
      admin: 'http://localhost:3000/login',
      analyst: 'http://localhost:4100',
      viewer: 'http://localhost:4000',
    };

    window.location.href = portMap[role];
  };

  // Redesigned roles with SVG icons
  const roles = [
    {
      id: 'admin',
      name: 'Admin Portal',
      description: 'System administration and user management',
      icon: (
        <svg className={styles.roleIconSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 19.5a7.5 7.5 0 0 1 10.595-6.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m14.4 12.6 3.6-1.35 3.6 1.35v2.7c0 2.04-1.23 3.96-3.6 4.95-2.37-.99-3.6-2.91-3.6-4.95v-2.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m16.8 15.75.9.9 1.5-1.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'analyst',
      name: 'Analyst Workspace',
      description: 'Data analysis and insights dashboard',
      icon: (
        <svg className={styles.roleIconSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7.5 17.25v-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 17.25V9.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16.5 17.25V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m7.5 12.75 4.5-3 4.5.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'viewer',
      name: 'User Dashboard',
      description: 'View reports and analytics',
      icon: (
        <svg className={styles.roleIconSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14.25 12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>Welcome to SentinelIQ | Security & Compliance Platform</title>
        <meta name="description" content="SentinelIQ - Enterprise Security & Compliance Platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.main}>
        {/* Modern Navbar */}
        <nav className={styles.navbar}>
          <div className={styles.navContainer}>
            <div className={styles.logoSection}>
              <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className={styles.logoIcon} />
              <span className={styles.logoText}>SentinelIQ</span>
            </div>
          </div>
        </nav>

        {/* Centered Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            {/* Main Heading */}
            <h1 className={styles.heroTitle}>Welcome to SentinelIQ</h1>

            {/* Description */}
            <p className={styles.heroDescription}>
              Enterprise-grade security and compliance platform designed for modern teams. Protect your data, monitor threats, and ensure regulatory compliance in real-time.
            </p>

            {/* Feature Highlights */}
            <div className={styles.featuresContainer}>
              <span className={styles.featureTag}>✓ Real-time threat detection</span>
              <span className={styles.featureDivider}>|</span>
              <span className={styles.featureTag}>✓ Compliance monitoring</span>
              <span className={styles.featureDivider}>|</span>
              <span className={styles.featureTag}>✓ Advanced analytics</span>
            </div>
          </div>
        </section>

        {/* Compact Role Selection Section */}
        <section className={styles.roleSection}>
          <div className={styles.roleContainer}>
            <h2 className={styles.roleTitle}>Select Your Portal</h2>

            <div className={styles.rolesGrid}>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`${styles.roleCard} ${hoveredRole === role.id ? styles.roleCardHovered : ''}`}
                  onMouseEnter={() => setHoveredRole(role.id)}
                  onMouseLeave={() => setHoveredRole(null)}
                >
                  <div className={styles.roleIcon}>{role.icon}</div>
                  <h3 className={styles.roleName}>{role.name}</h3>
                  <p className={styles.roleDescription}>{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
