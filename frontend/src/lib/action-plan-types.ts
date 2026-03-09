// Action Plan types — frontend-only view model for field operator Action Center

export interface ActionPlan {
  compressorId: string;
  model: string;
  stationName: string;
  stationId: string;
  status: 'critical' | 'warning' | 'monitoring';
  headline: string;
  diagnosis: string;
  safetyWarnings: SafetyWarning[];
  actionSteps: ActionStep[];
  partsAndTools: PartOrTool[];
  routing: RoutingAction;
  similarFixes: SimilarFix[];
  teamsNotification: TeamsNotificationData;
  confidence: number;
  estimatedHours: number | null;
  estimatedCost: number | null;
  createdAt: string;
}

export interface SafetyWarning {
  level: 'danger' | 'caution' | 'info';
  message: string;
}

export interface ActionStep {
  id: string;
  order: number;
  instruction: string;
  detail: string | null;
  priority: 'immediate' | 'next_shift' | 'next_maintenance_window' | 'monitor';
  requiresShutdown: boolean;
}

export interface PartOrTool {
  name: string;
  partNumber: string | null;
  quantity: number;
  type: 'part' | 'tool';
  estimatedCost: number | null;
}

export interface RoutingAction {
  primary: 'create_work_order' | 'escalate_supervisor' | 'monitor_no_action' | 'emergency_shutdown';
  label: string;
  description: string;
}

export interface SimilarFix {
  compressorId: string;
  model: string;
  date: string;
  issue: string;
  resolution: string;
  outcome: 'successful' | 'partial' | 'failed';
}

export interface TeamsNotificationData {
  title: string;
  severity: string;
  compressorId: string;
  stationName: string;
  message: string;
  sentAt: string;
  acknowledged: boolean;
}
