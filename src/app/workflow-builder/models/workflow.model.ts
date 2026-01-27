export interface Position {
    x: number;
    y: number;
}

export interface NodeModel {
    id: string;
    type: string;
    title?: string;
    label: string;
    position: Position;
}

export interface ConnectionModel {
    from: string; // node id
    to: string;   // node id
}
