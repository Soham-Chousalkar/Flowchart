import { Component, signal } from '@angular/core';
import { WorkflowBuilder } from './workflow-builder/workflow-builder.component';

@Component({
  selector: 'app-root',
  imports: [WorkflowBuilder],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('workflow-builder');
}
