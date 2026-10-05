import {
  FileText,
  HelpCircle,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  Activity,
  Layers,
  Clock,
  TrendingUp,
} from 'lucide-react';

const iconMap = {
  'total paper sets': FileText,
  'available paper sets': FileText,
  'paper sets': FileText,
  'total questions': HelpCircle,
  'questions': HelpCircle,
  'published papers': CheckCircle2,
  'published exams': CheckCircle2,
  'available exams': BookOpen,
  'completed exams': CheckCircle2,
  'students': Users,
  'latest result': Award,
  'results': Award,
  'status': Activity,
  'duration': Clock,
  'total marks': Layers,
};

const colorStyles = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    accent: 'bg-blue-600',
  },
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'bg-emerald-600',
  },
  purple: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accent: 'bg-indigo-600',
  },
  orange: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'bg-amber-600',
  },
  gray: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    accent: 'bg-slate-500',
  },
};

const DashboardCard = ({
  title,
  value,
  description,
  color = 'blue',
  icon: CustomIcon,
  trend,
}) => {
  const normalizedTitle = title ? title.toLowerCase() : '';
  const IconComponent = CustomIcon || iconMap[normalizedTitle] || FileText;
  const theme = colorStyles[color] || colorStyles.blue;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Top subtle highlight */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {value}
            </span>
            {trend && (
              <span className="inline-flex items-center text-xs font-semibold text-emerald-700 gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {trend}
              </span>
            )}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl ${theme.bg} ${theme.border} ${theme.text} border transition-transform duration-200 group-hover:scale-105 shrink-0`}
        >
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      {description && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{description}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors" />
        </div>
      )}
    </div>
  );
};

export default DashboardCard;