import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { WorkflowService } from './services/workflow.service';
import { NodeModel, ConnectionModel } from './models/workflow.model';

@Component({
    selector: 'app-workflow-builder',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './workflow-builder.component.html',
    styleUrl: './workflow-builder.component.css',
})
export class WorkflowBuilder implements AfterViewInit {
    // Palette node types
    nodeTypes: string[] = ['Start', 'Task', 'Decision', 'End'];

    // Runtime collections
    nodes: NodeModel[] = [];
    connections: ConnectionModel[] = [];

    // Interaction state
    canvasScale = 1;
    canvasTranslate = { x: 0, y: 0 };

    private draggingNodeType: string | null = null;
    private draggingNode: NodeModel | null = null;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private offset = { x: 0, y: 0 };

    // Connection state
    public activeConnection: { from: string, mouseX: number, mouseY: number } | null = null;
    private connectionStartNode: NodeModel | null = null;

    @ViewChild('canvasContainer', { static: true }) canvasRef!: ElementRef<HTMLElement>;

    constructor(private workflowService: WorkflowService) { }

    ngAfterViewInit() {
        // Initialize origin to center of view
        setTimeout(() => {
            this.centerOrigin();
        });
    }

    centerOrigin() {
        if (!this.canvasRef) return;
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.canvasTranslate = {
            x: rect.width / 2,
            y: rect.height / 2
        };
    }

    // Helper to get node position by ID
    getNodePosition(id: string): { x: number, y: number } {
        const node = this.nodes.find(n => n.id === id);
        return node ? node.position : { x: 0, y: 0 };
    }

    // ---------- Palette Drag ----------
    onDragStart(event: DragEvent, type: string) {
        this.draggingNodeType = type;
        event.dataTransfer?.setData('text/plain', type);
    }

    // ---------- Canvas Drop ----------
    @HostListener('dragover', ['$event'])
    onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent) {
        event.preventDefault();
        const type = this.draggingNodeType;
        if (!type) return;
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const x = (event.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale;
        const y = (event.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale;
        const newNode: NodeModel = {
            id: Date.now().toString(),
            type,
            title: type, // Initial title matches type
            label: `${type} Node Description`,
            position: { x: x - 75, y: y - 45 }, // Offset to drop in center of node (150px width)
        };
        this.nodes.push(newNode);
        this.draggingNodeType = null;
    }

    // ---------- Global Mouse Handlers ----------
    @HostListener('document:mousemove', ['$event'])
    onDocumentMouseMove(event: MouseEvent) {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();

        if (this.draggingNode) {
            const x = (event.clientX - rect.left - this.offset.x - this.canvasTranslate.x) / this.canvasScale;
            const y = (event.clientY - rect.top - this.offset.y - this.canvasTranslate.y) / this.canvasScale;
            this.draggingNode.position = { x, y };
        } else if (this.isPanning) {
            const dx = event.clientX - this.panStart.x;
            const dy = event.clientY - this.panStart.y;
            this.canvasTranslate.x += dx;
            this.canvasTranslate.y += dy;
            this.panStart = { x: event.clientX, y: event.clientY };
        } else if (this.activeConnection) {
            this.activeConnection.mouseX = (event.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale;
            this.activeConnection.mouseY = (event.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale;
        }
    }

    @HostListener('document:mouseup')
    onDocumentMouseUp() {
        this.draggingNode = null;
        this.isPanning = false;
        this.activeConnection = null;
        this.connectionStartNode = null;
    }

    // ---------- Node dragging ----------
    onNodeMouseDown(event: MouseEvent, node: NodeModel) {
        event.stopPropagation();
        event.preventDefault();
        this.draggingNode = node;
        const element = event.currentTarget as HTMLElement;
        const rect = element.getBoundingClientRect();
        this.offset.x = (event.clientX - rect.left) / this.canvasScale;
        this.offset.y = (event.clientY - rect.top) / this.canvasScale;
    }

    // ---------- Connection Handling ----------
    onHandleMouseDown(event: MouseEvent, node: NodeModel) {
        event.stopPropagation();
        event.preventDefault();
        this.connectionStartNode = node;
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.activeConnection = {
            from: node.id,
            mouseX: (event.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale,
            mouseY: (event.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale
        };
    }

    onNodeMouseUp(event: MouseEvent, node: NodeModel) {
        if (this.connectionStartNode && this.connectionStartNode.id !== node.id) {
            // Avoid duplicate connections
            const exists = this.connections.some(c => c.from === this.connectionStartNode!.id && c.to === node.id);
            if (!exists) {
                this.connections.push({
                    from: this.connectionStartNode.id,
                    to: node.id
                });
            }
        }
    }

    getConnectionPath(fromId: string, toId: string | null): string {
        const fromPos = this.getNodePosition(fromId);
        let toX: number, toY: number;

        if (toId) {
            const toPos = this.getNodePosition(toId);
            toX = toPos.x;
            toY = toPos.y + 45;
        } else if (this.activeConnection) {
            toX = this.activeConnection.mouseX;
            toY = this.activeConnection.mouseY;
        } else {
            return '';
        }

        const startX = fromPos.x + 150; // exact right edge
        const startY = fromPos.y + 45;  // center of node height

        const cp1x = startX + Math.abs(toX - startX) / 2;
        const cp2x = toX - Math.abs(toX - startX) / 2;

        return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${toY}, ${toX} ${toY}`;
    }

    // ---------- Canvas Zoom & Pan ----------
    onZoom(event: WheelEvent) {
        event.preventDefault();
        const delta = -event.deltaY;
        const factor = delta > 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(this.canvasScale * factor, 0.3), 2);

        // Zoom towards mouse point
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const worldX = (mouseX - this.canvasTranslate.x) / this.canvasScale;
        const worldY = (mouseY - this.canvasTranslate.y) / this.canvasScale;

        this.canvasScale = newScale;

        this.canvasTranslate.x = mouseX - worldX * this.canvasScale;
        this.canvasTranslate.y = mouseY - worldY * this.canvasScale;
    }

    onCanvasMouseDown(event: MouseEvent) {
        if (event.button === 0) { // Left click
            this.isPanning = true;
            this.panStart = { x: event.clientX, y: event.clientY };
        }
    }

    // ---------- Other actions ----------
    onInputFocus(event: FocusEvent) {
        const input = event.target as HTMLInputElement | HTMLTextAreaElement;
        input.select();
    }

    onInputMouseDown(event: MouseEvent) {
        event.stopPropagation();
    }

    resetView() {
        this.canvasScale = 1;
        this.centerOrigin();
    }


    saveWorkflow() {
        const json = this.workflowService.export(this.nodes, this.connections);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workflow.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    loadWorkflow() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const data = ev.target?.result as string;
                const { nodes, connections } = this.workflowService.import(data);
                this.nodes = nodes;
                this.connections = connections;
            };
            reader.readAsText(file);
        };
        input.click();
    }

    deleteNode(event: MouseEvent, node: NodeModel) {
        event.stopPropagation();
        this.nodes = this.nodes.filter(n => n.id !== node.id);
        this.connections = this.connections.filter(c => c.from !== node.id && c.to !== node.id);
    }

    darkMode = false;
    toggleTheme() {
        this.darkMode = !this.darkMode;
        if (this.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}
