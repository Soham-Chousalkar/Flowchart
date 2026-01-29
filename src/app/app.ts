import { Component } from '@angular/core';
import { WorkflowBuilder } from './workflow-builder/workflow-builder.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WorkflowBuilder],
  template: `<app-workflow-builder></app-workflow-builder>`,
  styles: [`:host { display: block; height: 100vh; width: 100vw; overflow: hidden; }`]
})
export class App { }
