import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('to-do-list-aws');
  task: string = '';
  taskList: { id: number, name: string }[] = [];

  addTask() {
    if (this.task.trim()) {
      const newTask = { id: Date.now(), name: this.task.trim() };
      this.taskList.push(newTask);
      this.task = '';
      console.log(this.taskList);
    }
  }

  deleteTask(id: number) {
    this.taskList = this.taskList.filter(task => task.id !== id);
  }
}
