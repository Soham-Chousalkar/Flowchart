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
    nodeTypes = ['Start', 'Task', 'Decision', 'End'];
    nodes: NodeModel[] = [];
    connections: ConnectionModel[] = [];

    // UI State
    canvasScale = 1;
    canvasTranslate = { x: 0, y: 0 };
    selectedId: string | null = null;
    selectedType: 'node' | 'conn' | null = null;
    isValid: boolean | null = null;
    darkMode = false;

    // History
    private history: string[] = [];
    private redoStack: string[] = [];

    // Drag/Pan State
    private draggingNodeType: string | null = null;
    private draggingNode: NodeModel | null = null;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private offset = { x: 0, y: 0 };
    public activeConnection: { from: string, mouseX: number, mouseY: number } | null = null;
    private connectionStartNode: NodeModel | null = null;

    @ViewChild('canvasContainer', { static: true }) canvasRef!: ElementRef<HTMLElement>;

    constructor(private workflowService: WorkflowService) { }

    ngAfterViewInit() { setTimeout(() => this.resetView()); }

    public saveHistory() {
        const state = JSON.stringify({ n: this.nodes, c: this.connections });
        if (this.history[this.history.length - 1] !== state) {
            this.history.push(state);
            this.redoStack = [];
            if (this.history.length > 30) this.history.shift();
        }
    }

    undo() {
        if (this.history.length > 1) {
            this.redoStack.push(this.history.pop()!);
            const state = JSON.parse(this.history[this.history.length - 1]);
            this.nodes = state.n;
            this.connections = state.c;
        }
    }

    redo() {
        if (this.redoStack.length) {
            const state = this.redoStack.pop()!;
            this.history.push(state);
            const parsed = JSON.parse(state);
            this.nodes = parsed.n;
            this.connections = parsed.c;
        }
    }

    // ---------- Interactions ----------
    @HostListener('document:keydown', ['$event'])
    onKeyDown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') e.shiftKey ? this.redo() : this.undo();
        if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
        if (this.selectedType === 'node' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const node = this.nodes.find(n => n.id === this.selectedId);
            if (node) {
                const step = e.shiftKey ? 50 : 10;
                if (e.key === 'ArrowUp') node.position.y -= step;
                if (e.key === 'ArrowDown') node.position.y += step;
                if (e.key === 'ArrowLeft') node.position.x -= step;
                if (e.key === 'ArrowRight') node.position.x += step;
                this.saveHistory();
            }
        }
    }

    deleteSelected() {
        if (!this.selectedId) return;
        if (this.selectedType === 'node') {
            this.nodes = this.nodes.filter(n => n.id !== this.selectedId);
            this.connections = this.connections.filter(c => c.from !== this.selectedId && c.to !== this.selectedId);
        } else {
            const [f, t] = (this.selectedId || '').split('->');
            this.connections = this.connections.filter(c => !(c.from === f && c.to === t));
        }
        this.selectedId = null;
        this.saveHistory();
    }

    validate() {
        if (this.nodes.length === 0) return this.isValid = false;
        const connectedNodes = new Set();
        this.connections.forEach(c => { connectedNodes.add(c.from); connectedNodes.add(c.to); });
        this.isValid = this.nodes.every(n => connectedNodes.has(n.id)) &&
            this.nodes.some(n => n.type === 'Start') &&
            this.nodes.some(n => n.type === 'End');
        setTimeout(() => this.isValid = null, 3000);
        return this.isValid;
    }

    // ---------- Palette Drag ----------
    onDragStart(event: DragEvent, type: string) {
        this.draggingNodeType = type;
        event.dataTransfer?.setData('text/plain', type);
    }

    @HostListener('dragover', ['$event']) onDragOver(e: DragEvent) { e.preventDefault(); }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent) {
        event.preventDefault();
        if (!this.draggingNodeType) return;
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.nodes.push({
            id: Date.now().toString(),
            type: this.draggingNodeType,
            title: `New ${this.draggingNodeType}`,
            label: `Configurable description here...`,
            position: {
                x: (event.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale - 100,
                y: (event.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale - 50
            },
        });
        this.draggingNodeType = null;
        this.saveHistory();
    }

    // ---------- Mouse Events ----------
    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        if (this.draggingNode) {
            this.draggingNode.position = {
                x: (event.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale - this.offset.x,
                y: (event.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale - this.offset.y
            };
        } else if (this.isPanning) {
            this.canvasTranslate.x += event.clientX - this.panStart.x;
            this.canvasTranslate.y += event.clientY - this.panStart.y;
            this.panStart = { x: event.clientX, y: event.clientY };
        } else if (this.activeConnection) {
            this.activeConnection.mouseX = (event.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale;
            this.activeConnection.mouseY = (event.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale;
        }
    }

    @HostListener('document:mouseup')
    onMouseUp() {
        if (this.draggingNode) this.saveHistory();
        this.draggingNode = null;
        this.isPanning = false;
        this.activeConnection = null;
        this.connectionStartNode = null;
    }

    onNodeMouseDown(e: MouseEvent, node: NodeModel) {
        e.stopPropagation();
        e.preventDefault();
        this.selectedId = node.id;
        this.selectedType = 'node';
        this.draggingNode = node;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        this.offset = { x: (e.clientX - rect.left) / this.canvasScale, y: (e.clientY - rect.top) / this.canvasScale };
    }

    onHandleMouseDown(e: MouseEvent, node: NodeModel) {
        e.stopPropagation();
        this.connectionStartNode = node;
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.activeConnection = {
            from: node.id,
            mouseX: (e.clientX - rect.left - this.canvasTranslate.x) / this.canvasScale,
            mouseY: (e.clientY - rect.top - this.canvasTranslate.y) / this.canvasScale
        };
    }

    onNodeMouseUp(e: MouseEvent, node: NodeModel) {
        if (this.connectionStartNode && this.connectionStartNode.id !== node.id) {
            if (!this.connections.some(c => c.from === this.connectionStartNode!.id && c.to === node.id)) {
                this.connections.push({ from: this.connectionStartNode.id, to: node.id });
                this.saveHistory();
            }
        }
    }

    selectConn(e: MouseEvent, c: ConnectionModel) {
        e.stopPropagation();
        this.selectedId = `${c.from}->${c.to}`;
        this.selectedType = 'conn';
    }

    // ---------- Canvas Helpers ----------
    getConnectionPath(fromId: string, toId: string | null): string {
        const from = this.nodes.find(n => n.id === fromId)?.position || { x: 0, y: 0 };
        let toX: number, toY: number;
        if (toId) {
            const to = this.nodes.find(n => n.id === toId)?.position || { x: 0, y: 0 };
            toX = to.x; toY = to.y + 50;
        } else if (this.activeConnection) {
            toX = this.activeConnection.mouseX; toY = this.activeConnection.mouseY;
        } else return '';

        const sX = from.x + 200, sY = from.y + 50;
        const cp1x = sX + Math.abs(toX - sX) / 2, cp2x = toX - Math.abs(toX - sX) / 2;
        return `M ${sX} ${sY} C ${cp1x} ${sY}, ${cp2x} ${toY}, ${toX} ${toY}`;
    }

    onZoom(e: WheelEvent) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(this.canvasScale * factor, 0.3), 2);
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const mX = e.clientX - rect.left, mY = e.clientY - rect.top;
        const wX = (mX - this.canvasTranslate.x) / this.canvasScale, wY = (mY - this.canvasTranslate.y) / this.canvasScale;
        this.canvasScale = newScale;
        this.canvasTranslate = { x: mX - wX * newScale, y: mY - wY * newScale };
    }

    onCanvasMouseDown(e: MouseEvent) {
        if (e.button === 0) { this.isPanning = true; this.panStart = { x: e.clientX, y: e.clientY }; }
        this.selectedId = null; this.selectedType = null;
    }

    resetView() {
        this.canvasScale = 1;
        if (!this.canvasRef) return;
        const r = this.canvasRef.nativeElement.getBoundingClientRect();
        this.canvasTranslate = { x: r.width / 2, y: r.height / 2 };
    }

    saveWorkflow() {
        const json = this.workflowService.export(this.nodes, this.connections);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = 'workflow.json'; a.click();
    }

    loadWorkflow() {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.onchange = (e: any) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const { nodes, connections } = this.workflowService.import(ev.target?.result as string);
                this.nodes = nodes; this.connections = connections; this.saveHistory();
            };
            reader.readAsText(e.target.files[0]);
        };
        input.click();
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        document.documentElement.classList.toggle('dark', this.darkMode);
    }

    getSelectedNode() { return this.nodes.find(n => n.id === this.selectedId); }
}

