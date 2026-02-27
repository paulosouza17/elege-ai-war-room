
import { FlowExecution } from '../../types/flow';

interface ManualInputContext {
    activation_id: string;
    file_url?: string;
    file_type?: string;
    content?: string;
}

export const manualInputTrigger = {
    id: 'manual_input',
    name: 'Input Manual',
    description: 'Dispara quando um arquivo ou texto é inserido manualmente.',

    // This function checks if the event matches the trigger configuration
    matches: (triggerConfig: any, event: any) => {
        // Event should be the intelligence_feed item
        if (event.source !== 'manual_upload') return false;

        // Check if activation matches (if configured)
        if (triggerConfig.activation_id && triggerConfig.activation_id !== event.activation_id) {
            return false;
        }

        return true;
    },

    // Extracts context for the flow execution
    getContext: (event: any): ManualInputContext => {
        return {
            activation_id: event.activation_id,
            file_url: event.file_url,
            file_type: event.file_type,
            content: event.content // Or summary/title if text input
        };
    }
};
