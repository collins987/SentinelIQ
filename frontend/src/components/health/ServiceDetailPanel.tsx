import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CircleStackIcon, CpuChipIcon, SignalIcon, GlobeAltIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { SignalIcon as SignalSolidIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import type { ServiceName, ServiceHealth, HealthHistoryPoint } from '../../services/dashboardApi';
import { useGetHealthHistoryQuery } from '../../services/dashboardApi';
import { useAppSelector } from '../../store/hooks';
import DatabaseDetail from './DatabaseDetail';
import RedisDetail from './RedisDetail';
import KafkaDetail from './KafkaDetail';
import VaultDetail from './VaultDetail';

const svcMeta: Record<ServiceName, {
  icon: typeof CircleStackIcon;
  color: string;
  textColor: string;
  gradient: string;
  borderGlow: string;
  label: string;
  description: string;
}> = {
  database: {
    icon: CircleStackIcon,
    color: 'text-blue-400',
    textColor: 'text-blue-300',
    gradient: 'from-blue-600/20 via-blue-500/5 to-transparent',
    borderGlow: 'border-blue-500/20',
    label: 'PostgreSQL Database',
    description: 'Primary relational data store',
  },
  redis: {
    icon: CpuChipIcon,
    color: 'text-red-400',
    textColor: 'text-red-300',
    gradient: 'from-red-600/20 via-red-500/5 to-transparent',
    borderGlow: 'border-red-500/20',
    label: 'Redis Cache',
    description: 'In-memory data store & cache',
  },
  kafka: {
    icon: SignalIcon,
    color: 'text-orange-400',
    textColor: 'text-orange-300',
    gradient: 'from-orange-600/20 via-orange-500/5 to-transparent',
    borderGlow: 'border-orange-500/20',
    label: 'Apache Kafka',
    description: 'Event streaming platform',
  },
  vault: {
    icon: GlobeAltIcon,
    color: 'text-purple-400',
    textColor: 'text-purple-300',
    gradient: 'from-purple-600/20 via-purple-500/5 to-transparent',
    borderGlow: 'border-purple-500/20',
    label: 'HashiCorp Vault',
    description: 'Secrets management & encryption',
  },
};

interface Props {
  service: ServiceName | null;
  data: ServiceHealth | undefined;
  onClose: () => void;
}

export default function ServiceDetailPanel({ service, data, onClose }: Props) {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { data: historyResp } = useGetHealthHistoryQuery(
    { service: service!, points: 60 },
    { skip: !service || !isAuthenticated, pollingInterval: 30000 },
  );

  const isOpen = service !== null && data !== undefined;
  const meta = service ? svcMeta[service] : svcMeta.database;
  const Icon = meta.icon;
  const history: HealthHistoryPoint[] = historyResp?.points ?? [];

  const statusBadge = (status: string) => {
    if (status === 'healthy')
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Healthy
        </span>
      );
    if (status === 'unhealthy' || status === 'unavailable')
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Unhealthy
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Full-page overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />
        </Transition.Child>

        {/* Full-page panel */}
        <div className="fixed inset-0 z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-[0.97]"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-[0.97]"
          >
            <Dialog.Panel className="flex h-full w-full flex-col bg-dashboard-bg">
              {/* ── Header ── fixed, never overlaps content */}
              <div className={clsx(
                'shrink-0 border-b bg-gradient-to-r',
                meta.gradient,
                meta.borderGlow,
              )}>
                <div className="mx-auto max-w-7xl px-6 py-5">
                  <div className="flex items-center justify-between">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={onClose}
                        className="group flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        Back
                      </button>
                      <div className="h-8 w-px bg-white/10" />
                      <div className={clsx('flex items-center justify-center h-11 w-11 rounded-xl bg-white/5 border border-white/10')}>
                        <Icon className={clsx('h-6 w-6', meta.color)} />
                      </div>
                      <div>
                        <Dialog.Title className="text-xl font-bold text-white tracking-tight">
                          {meta.label}
                        </Dialog.Title>
                        <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
                      </div>
                    </div>
                    {/* Right: Status + Close */}
                    <div className="flex items-center gap-4">
                      {data && statusBadge(data.status)}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <SignalSolidIcon className="h-3 w-3 text-green-500 animate-pulse" />
                        Live
                      </div>
                      <button
                        onClick={onClose}
                        className="rounded-xl p-2.5 text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl px-6 py-6">
                  {service === 'database' && data && <DatabaseDetail data={data} history={history} />}
                  {service === 'redis'    && data && <RedisDetail data={data} history={history} />}
                  {service === 'kafka'    && data && <KafkaDetail data={data} history={history} />}
                  {service === 'vault'    && data && <VaultDetail data={data} history={history} />}
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="shrink-0 border-t border-white/5 bg-dashboard-bg/80 backdrop-blur">
                <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Auto-refreshes every 30s
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg bg-white/5 border border-white/10 px-4 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
