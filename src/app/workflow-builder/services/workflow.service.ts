import { Injectable } from '@angular/core';
import { NodeModel, ConnectionModel } from '../models/workflow.model';

@Injectable({
    providedIn: 'root',
})
export class WorkflowService {
    /** Export current workflow to JSON string */
    export(nodes: NodeModel[], connections: ConnectionModel[]): string {
        const data = { nodes, connections };
        return JSON.stringify(data, null, 2);
    }

    /** Import workflow from JSON string */
    import(json: string): { nodes: NodeModel[]; connections: ConnectionModel[] } {
        try {
            const parsed = JSON.parse(json);
            const nodes: NodeModel[] = parsed.nodes ?? [];
            const connections: ConnectionModel[] = parsed.connections ?? [];
            return { nodes, connections };
        } catch (e) {
            console.error('Invalid workflow JSON', e);
            return { nodes: [], connections: [] };
        }
    }
}
