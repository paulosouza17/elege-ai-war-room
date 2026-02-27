export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type CrisisStatus = 'active' | 'resolved' | 'archived' | 'pending_approval' | 'draft';

export interface CrisisPacket {
    id: string;
    title: string;
    description: string;
    summary?: string;
    severity: SeverityLevel;
    status: CrisisStatus;
    created_at: string;
    owner_id?: string;
    plan?: any;
    user_feedback?: string;
    comments?: any[];
    evidence_ids?: string[];
}
