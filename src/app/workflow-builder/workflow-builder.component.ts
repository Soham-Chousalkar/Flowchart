import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, HostListener, ViewChild, AfterViewInit } from '@angular/core';

// --- Types ---
export interface Position { x: number; y: number; }
export interface NodeModel { id: string; type: string; title?: string; label: string; position: Position; }
export interface ConnectionModel { from: string; to: string; }

// --- Component ---
@Component({
    selector: 'app-workflow-builder',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
<div class="workflow-builder" [class.dark]="darkMode">
  <div class="toolbar">
    <div class="btn-group">
      <button (click)="resetView()" title="Reset View"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg> <span>Reset</span></button>
      <button (click)="undo()" title="Undo (Ctrl+Z)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg></button>
      <button (click)="redo()" title="Redo (Ctrl+Shift+Z)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 14l5-5-5-5" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" /></svg></button>
    </div>
    <div class="btn-group">
      <button (click)="validate()" [class.valid]="isValid===true" [class.invalid]="isValid===false" title="Validate Workflow"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> <span>Validate</span></button>
      <button (click)="saveWorkflow()"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg> <span>Save</span></button>
      <button (click)="loadWorkflow()"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg> <span>Load</span></button>
    </div>
    <button (click)="toggleTheme()"><svg *ngIf="!darkMode" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg><svg *ngIf="darkMode" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg></button>
  </div>
  <div class="main-area">
    <aside class="palette">
      <h3>Components</h3>
      <div class="palette-list">
        <div *ngFor="let type of nodeTypes" draggable="true" (dragstart)="onDragStart($event, type)" [class]="'palette-item ' + type.toLowerCase()">
          <div class="palette-icon" [ngSwitch]="type">
            <svg *ngSwitchCase=\"'Start'\" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8l4 4-4 4M8 12h8" /></svg>
            <svg *ngSwitchCase=\"'Task'\" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
            <svg *ngSwitchCase=\"'Decision'\" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
            <svg *ngSwitchCase=\"'End'\" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
          </div>
          <span>{{type}}</span>
        </div>
      </div>
    </aside>
    <section class="canvas" #canvasContainer (wheel)="onZoom($event)" (mousedown)="onCanvasMouseDown($event)" tabindex="0">
      <div class="canvas-transform" [style.transform]="'translate(' + canvasTranslate.x + 'px,' + canvasTranslate.y + 'px) scale(' + canvasScale + ')'">
        <svg class="connections" width="5000" height="5000">
          <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" /></marker></defs>
          <g *ngFor="let c of connections" class="conn-group" [class.selected]="selectedType==='conn' && selectedId===c.from+'->'+c.to" (mousedown)="selectConn($event, c)">
            <path [attr.d]="getConnectionPath(c.from, c.to)" fill="none" stroke="transparent" stroke-width="20" />
            <path [attr.d]="getConnectionPath(c.from, c.to)" fill="none" stroke-width="3" marker-end="url(#arrow)" />
          </g>
          <path *ngIf="activeConnection" [attr.d]="getConnectionPath(activeConnection.from, null)" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5,5" />
        </svg>
        <div [class]="'node ' + node.type.toLowerCase()" *ngFor="let node of nodes" [style.left.px]="node.position.x" [style.top.px]="node.position.y" [class.selected]="selectedId===node.id && selectedType==='node'" (mousedown)="onNodeMouseDown($event, node)" (mouseup)="onNodeMouseUp($event, node)" tabindex="0">
          <div class="node-header">
            <span class="node-type-tag">{{node.type}}</span>
            <button class="delete-btn" (click)="deleteSelected()" *ngIf="selectedId===node.id && selectedType==='node'"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
          </div>
          <div class="node-content"><strong>{{node.title}}</strong><p>{{node.label}}</p></div>
          <div class="handle" (mousedown)="onHandleMouseDown($event, node)"></div>
        </div>
      </div>
    </section>
    <aside class="config-panel" *ngIf="selectedId">
      <h3>{{selectedType === 'node' ? 'Node' : 'Connection'}} Settings</h3>
      <div *ngIf=\"selectedType === 'node' && getSelectedNode() as node\" class=\"config-form\">
        <label>Title</label><input [(ngModel)]=\"node.title\" (ngModelChange)=\"saveHistory()\">
        <label>Description</label><textarea [(ngModel)]=\"node.label\" (ngModelChange)=\"saveHistory()\" rows=\"4\"></textarea>
        <button class=\"danger-btn\" (click)=\"deleteSelected()\">Delete Node</button>
      </div>
      <div *ngIf=\"selectedType === 'conn'\" class=\"config-form\">
        <p>Connecting: <code>{{selectedId}}</code></p>
        <button class=\"danger-btn\" (click)=\"deleteSelected()\">Delete Connection</button>
      </div>
    </aside>
  </div>
</div>`,
    styles: [`
.workflow-builder { display: flex; flex-direction: column; height: 100vh; background: #ffffff; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; transition: background-color 0.3s, color 0.3s; user-select: none; --start-color: #10b981; --task-color: #3b82f6; --decision-color: #f59e0b; --end-color: #f43f5e; --primary-accent: #6366f1; }
.workflow-builder.dark { background: #000000; color: #e5e7eb; }
.toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; background: #ffffff; border-bottom: 2px solid #e2e8f0; z-index: 100; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.workflow-builder.dark .toolbar { background: #000000; border-color: #1f2937; }
.btn-group { display: flex; background: #f1f5f9; padding: 0.3rem; border-radius: 10px; gap: 4px; }
.workflow-builder.dark .btn-group { background: #111827; }
button { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; border: 1px solid transparent; background: transparent; color: inherit; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: 0.2s; white-space: nowrap; }
button:hover { background: #f1f5f9; border-color: #cbd5e1; }
.workflow-builder.dark button:hover { background: #1f2937; border-color: #374151; }
.btn-group button { background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.workflow-builder.dark .btn-group button { background: #1f2937; border-color: #374151; }
button.valid { color: #059669; border-color: #059669; background: rgba(16, 185, 129, 0.05); }
button.invalid { color: #dc2626; border-color: #dc2626; background: rgba(239, 68, 68, 0.05); }
.main-area { display: flex; flex: 1; overflow: hidden; position: relative; }
.palette { width: 240px; background: #fcfcfc; border-right: 2px solid #e2e8f0; padding: 1.5rem; }
.workflow-builder.dark .palette { background: #0a0a0a; border-color: #1f2937; }
.palette h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin-bottom: 1.25rem; font-weight: 700; }
.palette-list { display: flex; flex-direction: column; gap: 0.85rem; }
.palette-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; cursor: grab; transition: 0.2s ease; --accent: var(--primary-accent); }
.palette-item.start { --accent: var(--start-color); }
.palette-item.task { --accent: var(--task-color); }
.palette-item.decision { --accent: var(--decision-color); }
.palette-item.end { --accent: var(--end-color); }
.workflow-builder.dark .palette-item { background: #111827; border-color: #374151; }
.palette-item:active { cursor: grabbing; }
.palette-item:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-color: var(--accent); background: white; }
.workflow-builder.dark .palette-item:hover { background: #1f2937; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); }
.palette-icon { color: var(--accent); }
.canvas { flex: 1; position: relative; overflow: hidden; background-image: radial-gradient(#94a3b8 1.5px, transparent 1.5px); background-size: 40px 40px; cursor: crosshair; outline: none; user-select: none; background-color: #f8fafc; }
.workflow-builder.dark .canvas { background-color: #000000; background-image: radial-gradient(#374151 1.5px, transparent 1.5px); }
.canvas-transform { position: absolute; transform-origin: 0 0; }
.connections { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; }
.conn-group { pointer-events: all; cursor: pointer; stroke: #64748b; transition: 0.2s; color: #64748b; }
.conn-group:hover, .conn-group.selected { stroke: var(--primary-accent); color: var(--primary-accent); }
.workflow-builder.dark .conn-group { stroke: #4b5563; color: #4b5563; }
.node { position: absolute; width: 220px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0; cursor: move; transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; outline: none; --accent: var(--primary-accent); border-left: 6px solid var(--accent); }
.node.start { --accent: var(--start-color); }
.node.task { --accent: var(--task-color); }
.node.decision { --accent: var(--decision-color); }
.node.end { --accent: var(--end-color); }
.workflow-builder.dark .node { background: #111827; border-color: #374151; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4); }
.node.selected { border-color: var(--accent); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); transform: scale(1.03); }
.node-header { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0.8rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.workflow-builder.dark .node-header { background: #0a0a0a; border-color: #374151; }
.node-type-tag { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--accent); letter-spacing: 0.08em; }
.node-content { padding: 1.25rem; }
.node-content strong { display: block; font-size: 1rem; margin-bottom: 0.5rem; color: #0f172a; font-weight: 600; }
.workflow-builder.dark .node-content strong { color: #f3f4f6; }
.node-content p { font-size: 0.85rem; color: #475569; margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.workflow-builder.dark .node-content p { color: #9ca3af; }
.handle { position: absolute; right: -8px; top: calc(50% - 8px); width: 18px; height: 18px; background: var(--accent); border: 4px solid #ffffff; border-radius: 50%; cursor: crosshair; transition: 0.2s; z-index: 10; opacity: 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
.workflow-builder.dark .handle { border-color: #111827; }
.node:hover .handle, .node.selected .handle { opacity: 1; }
.handle:hover { transform: scale(1.3); }
.config-panel { width: 320px; background: #ffffff; border-left: 2px solid #e2e8f0; padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.workflow-builder.dark .config-panel { background: #0a0a0a; border-color: #1f2937; }
.config-form { display: flex; flex-direction: column; gap: 1.5rem; }
.config-form h3 { font-size: 1.25rem; margin: 0; color: #0f172a; font-weight: 700; }
.workflow-builder.dark .config-form h3 { color: #f9fafb; }
.config-form label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
input, textarea { padding: 0.85rem; border: 2px solid #e2e8f0; border-radius: 12px; background: #ffffff; font-size: 0.95rem; color: inherit; width: 100%; box-sizing: border-box; transition: all 0.2s; }
.workflow-builder.dark input, .workflow-builder.dark textarea { background: #000000; border-color: #374151; }
input:focus, textarea:focus { outline: none; border-color: var(--primary-accent); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
.danger-btn { background: #fee2e2; color: #dc2626; width: 100%; justify-content: center; font-weight: 700; margin-top: 1.5rem; padding: 0.9rem; border: 1.5px solid #fecaca; }
.workflow-builder.dark .danger-btn { background: #450a0a; border-color: #7f1d1d; color: #f87171; }
.danger-btn:hover { background: #fecaca; transform: translateY(-2px); }
.delete-btn { padding: 8px; color: #94a3b8; border-radius: 8px; transition: 0.2s; }
.delete-btn:hover { background: #fee2e2; color: #dc2626; }
  `]
})
export class WorkflowBuilder implements AfterViewInit {
    nodeTypes = ['Start', 'Task', 'Decision', 'End'];
    nodes: NodeModel[] = [];
    connections: ConnectionModel[] = [];
    canvasScale = 1;
    canvasTranslate = { x: 0, y: 0 };
    selectedId: string | null = null;
    selectedType: 'node' | 'conn' | null = null;
    isValid: boolean | null = null;
    darkMode = false;
    private history: string[] = [];
    private redoStack: string[] = [];
    private draggingNodeType: string | null = null;
    private draggingNode: NodeModel | null = null;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private offset = { x: 0, y: 0 };
    public activeConnection: { from: string, mouseX: number, mouseY: number } | null = null;
    private connectionStartNode: NodeModel | null = null;

    @ViewChild('canvasContainer', { static: true }) canvasRef!: ElementRef<HTMLElement>;

    ngAfterViewInit() { setTimeout(() => this.resetView()); }

    public saveHistory() {
        const s = JSON.stringify({ n: this.nodes, c: this.connections });
        if (this.history[this.history.length - 1] !== s) {
            this.history.push(s); this.redoStack = [];
            if (this.history.length > 30) this.history.shift();
        }
    }

    undo() {
        if (this.history.length > 1) {
            this.redoStack.push(this.history.pop()!);
            const s = JSON.parse(this.history[this.history.length - 1]);
            this.nodes = s.n; this.connections = s.c;
        }
    }

    redo() {
        if (this.redoStack.length) {
            const s = this.redoStack.pop()!; this.history.push(s);
            const p = JSON.parse(s); this.nodes = p.n; this.connections = p.c;
        }
    }

    @HostListener('document:keydown', ['$event'])
    onKeyDown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') e.shiftKey ? this.redo() : this.undo();
        if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
        if (this.selectedType === 'node' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const n = this.nodes.find(x => x.id === this.selectedId);
            if (n) {
                const step = e.shiftKey ? 50 : 10;
                if (e.key === 'ArrowUp') n.position.y -= step;
                if (e.key === 'ArrowDown') n.position.y += step;
                if (e.key === 'ArrowLeft') n.position.x -= step;
                if (e.key === 'ArrowRight') n.position.x += step;
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
            const [f, t] = this.selectedId.split('->');
            this.connections = this.connections.filter(c => !(c.from === f && c.to === t));
        }
        this.selectedId = null; this.saveHistory();
    }

    validate() {
        if (!this.nodes.length) return this.isValid = false;
        const conn = new Set();
        this.connections.forEach(c => { conn.add(c.from); conn.add(c.to); });
        this.isValid = this.nodes.every(n => conn.has(n.id)) && this.nodes.some(n => n.type === 'Start') && this.nodes.some(n => n.type === 'End');
        setTimeout(() => this.isValid = null, 3000);
        return this.isValid;
    }

    onDragStart(e: DragEvent, type: string) { this.draggingNodeType = type; e.dataTransfer?.setData('text/plain', type); }
    @HostListener('dragover', ['$event']) onDragOver(e: DragEvent) { e.preventDefault(); }
    @HostListener('drop', ['$event']) onDrop(e: DragEvent) {
        e.preventDefault(); if (!this.draggingNodeType) return;
        const r = this.canvasRef.nativeElement.getBoundingClientRect();
        this.nodes.push({ id: Date.now().toString(), type: this.draggingNodeType, title: `New ${this.draggingNodeType}`, label: 'Description...', position: { x: (e.clientX - r.left - this.canvasTranslate.x) / this.canvasScale - 100, y: (e.clientY - r.top - this.canvasTranslate.y) / this.canvasScale - 50 } });
        this.draggingNodeType = null; this.saveHistory();
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        const r = this.canvasRef.nativeElement.getBoundingClientRect();
        if (this.draggingNode) {
            this.draggingNode.position = { x: (e.clientX - r.left - this.canvasTranslate.x) / this.canvasScale - this.offset.x, y: (e.clientY - r.top - this.canvasTranslate.y) / this.canvasScale - this.offset.y };
        } else if (this.isPanning) {
            this.canvasTranslate.x += e.clientX - this.panStart.x; this.canvasTranslate.y += e.clientY - this.panStart.y;
            this.panStart = { x: e.clientX, y: e.clientY };
        } else if (this.activeConnection) {
            this.activeConnection.mouseX = (e.clientX - r.left - this.canvasTranslate.x) / this.canvasScale;
            this.activeConnection.mouseY = (e.clientY - r.top - this.canvasTranslate.y) / this.canvasScale;
        }
    }

    @HostListener('document:mouseup')
    onMouseUp() { if (this.draggingNode) this.saveHistory(); this.draggingNode = null; this.isPanning = false; this.activeConnection = null; this.connectionStartNode = null; }

    onNodeMouseDown(e: MouseEvent, node: NodeModel) {
        e.stopPropagation(); e.preventDefault(); this.selectedId = node.id; this.selectedType = 'node'; this.draggingNode = node;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        this.offset = { x: (e.clientX - r.left) / this.canvasScale, y: (e.clientY - r.top) / this.canvasScale };
    }

    onHandleMouseDown(e: MouseEvent, node: NodeModel) {
        e.stopPropagation(); this.connectionStartNode = node;
        const r = this.canvasRef.nativeElement.getBoundingClientRect();
        this.activeConnection = { from: node.id, mouseX: (e.clientX - r.left - this.canvasTranslate.x) / this.canvasScale, mouseY: (e.clientY - r.top - this.canvasTranslate.y) / this.canvasScale };
    }

    onNodeMouseUp(e: MouseEvent, node: NodeModel) {
        if (this.connectionStartNode && this.connectionStartNode.id !== node.id) {
            if (!this.connections.some(c => c.from === this.connectionStartNode!.id && c.to === node.id)) { this.connections.push({ from: this.connectionStartNode.id, to: node.id }); this.saveHistory(); }
        }
    }

    selectConn(e: MouseEvent, c: ConnectionModel) { e.stopPropagation(); this.selectedId = `${c.from}->${c.to}`; this.selectedType = 'conn'; }

    getConnectionPath(fId: string, tId: string | null): string {
        const f = this.nodes.find(n => n.id === fId)?.position || { x: 0, y: 0 };
        let tX: number, tY: number;
        if (tId) { const t = this.nodes.find(n => n.id === tId)?.position || { x: 0, y: 0 }; tX = t.x; tY = t.y + 50; }
        else if (this.activeConnection) { tX = this.activeConnection.mouseX; tY = this.activeConnection.mouseY; } else return '';
        const sX = f.x + 220, sY = f.y + 50;
        const cp1x = sX + Math.abs(tX - sX) / 2, cp2x = tX - Math.abs(tX - sX) / 2;
        return `M ${sX} ${sY} C ${cp1x} ${sY}, ${cp2x} ${tY}, ${tX} ${tY}`;
    }

    onZoom(e: WheelEvent) {
        e.preventDefault(); const factor = e.deltaY > 0 ? 0.9 : 1.1; const newScale = Math.min(Math.max(this.canvasScale * factor, 0.3), 2);
        const r = this.canvasRef.nativeElement.getBoundingClientRect(); const mX = e.clientX - r.left, mY = e.clientY - r.top;
        const wX = (mX - this.canvasTranslate.x) / this.canvasScale, wY = (mY - this.canvasTranslate.y) / this.canvasScale;
        this.canvasScale = newScale; this.canvasTranslate = { x: mX - wX * newScale, y: mY - wY * newScale };
    }

    onCanvasMouseDown(e: MouseEvent) { if (e.button === 0) { this.isPanning = true; this.panStart = { x: e.clientX, y: e.clientY }; } this.selectedId = null; this.selectedType = null; }

    resetView() { this.canvasScale = 1; if (!this.canvasRef) return; const r = this.canvasRef.nativeElement.getBoundingClientRect(); this.canvasTranslate = { x: r.width / 2, y: r.height / 2 }; }

    saveWorkflow() {
        const data = { nodes: this.nodes, connections: this.connections }; const json = JSON.stringify(data, null, 2);
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'workflow.json'; a.click();
    }

    loadWorkflow() {
        const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
        i.onchange = (e: any) => {
            const r = new FileReader(); r.onload = (ev) => {
                const p = JSON.parse(ev.target?.result as string); this.nodes = p.nodes || []; this.connections = p.connections || []; this.saveHistory();
            }; r.readAsText(e.target.files[0]);
        }; i.click();
    }

    toggleTheme() { this.darkMode = !this.darkMode; document.documentElement.classList.toggle('dark', this.darkMode); }
    getSelectedNode() { return this.nodes.find(n => n.id === this.selectedId); }
}
