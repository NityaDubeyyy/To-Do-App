class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTodos();
        this.updateStats();
        this.toggleEmptyState();
        this.initTheme();
    }

    initTheme() {
        const themeSwitch = document.getElementById('themeSwitch');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            themeSwitch.setAttribute('aria-pressed', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            themeSwitch.setAttribute('aria-pressed', 'false');
        }
        const toggleTheme = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeSwitch.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        };
        themeSwitch.addEventListener('click', toggleTheme);
        themeSwitch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    setThemeIcon(mode) {
        // No longer needed with new switch UI
    }

    bindEvents() {
        // Add todo
        const addBtn = document.getElementById('addBtn');
        const todoInput = document.getElementById('todoInput');
        const dateInput = document.getElementById('todoDate');
        const timeInput = document.getElementById('todoTime');

        addBtn.addEventListener('click', () => this.addTodo());
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Filters
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });

        // Clear completed
        document.getElementById('clearCompleted').addEventListener('click', () => {
            this.clearCompleted();
        });
    }

    addTodo() {
        const input = document.getElementById('todoInput');
        const dateInput = document.getElementById('todoDate');
        const timeInput = document.getElementById('todoTime');
        const text = input.value.trim();
        const date = dateInput.value;
        const time = timeInput.value;

        if (text === '') {
            this.showNotification('Please enter a task!', 'error');
            return;
        }

        // Prevent adding tasks in the past
        if (date || time) {
            let due;
            if (date && time) {
                due = new Date(`${date}T${time}`);
            } else if (date) {
                due = new Date(`${date}T23:59:59`);
            } else {
                // Only time, use today
                const today = new Date();
                due = new Date(today.toISOString().split('T')[0] + 'T' + time);
            }
            const now = new Date();
            if (due < now) {
                this.showNotification('Cannot add a task for a past date/time!', 'error');
                return;
            }
        }

        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            date: date,
            time: time
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
        this.toggleEmptyState();

        input.value = '';
        dateInput.value = '';
        timeInput.value = '';
        this.showNotification('Task added successfully!', 'success');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.renderTodos();
            this.updateStats();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
        this.toggleEmptyState();
        this.showNotification('Task deleted!', 'info');
    }

    editTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newText = prompt('Edit task:', todo.text);
        if (newText !== null && newText.trim() !== '') {
            todo.text = newText.trim();
            this.saveTodos();
            this.renderTodos();
            this.showNotification('Task updated!', 'success');
        }
    }

    clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showNotification('No completed tasks to clear!', 'info');
            return;
        }

        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        this.renderTodos();
        this.updateStats();
        this.toggleEmptyState();
        this.showNotification(`${completedCount} completed task(s) cleared!`, 'success');
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTodos();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        const filteredTodos = this.getFilteredTodos();

        todoList.innerHTML = '';

        filteredTodos.forEach(todo => {
            const todoItem = this.createTodoElement(todo);
            todoList.appendChild(todoItem);
        });
    }

    createTodoElement(todo) {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        todoItem.dataset.id = todo.id;

        let dateTimeHtml = '';
        if (todo.date || todo.time) {
            dateTimeHtml = `<div class="todo-datetime">`;
            if (todo.date) {
                dateTimeHtml += `<span class="todo-date"><i class='fas fa-calendar-alt'></i> ${todo.date}</span>`;
            }
            if (todo.time) {
                let timeRemainingHtml = '';
                if (!todo.completed && (todo.date || todo.time)) {
                    const remaining = this.getTimeRemaining(todo.date, todo.time);
                    if (remaining.status === 'overdue') {
                        timeRemainingHtml = `<span class="time-remaining overdue">Overdue</span>`;
                    } else if (remaining.status === 'due') {
                        timeRemainingHtml = `<span class="time-remaining due">Due now!</span>`;
                    } else {
                        timeRemainingHtml = `<span class="time-remaining">${remaining.text}</span>`;
                    }
                }
                dateTimeHtml += `<span class="todo-time"><i class='fas fa-clock'></i> ${todo.time}</span>${timeRemainingHtml}`;
            }
            dateTimeHtml += `</div>`;
        }

        todoItem.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${this.escapeHtml(todo.text)}</span>
            ${dateTimeHtml}
            <div class="todo-actions">
                <button class="action-btn edit-btn" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Bind events
        const checkbox = todoItem.querySelector('.todo-checkbox');
        const editBtn = todoItem.querySelector('.edit-btn');
        const deleteBtn = todoItem.querySelector('.delete-btn');

        checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
        editBtn.addEventListener('click', () => this.editTodo(todo.id));
        deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

        return todoItem;
    }

    getTimeRemaining(date, time) {
        if (!date && !time) return { status: '', text: '' };
        let due;
        if (date && time) {
            due = new Date(`${date}T${time}`);
        } else if (date) {
            due = new Date(`${date}T23:59:59`);
        } else {
            // Only time, use today
            const today = new Date();
            due = new Date(today.toISOString().split('T')[0] + 'T' + time);
        }
        const now = new Date();
        const diff = due - now;
        if (diff < -60000) {
            return { status: 'overdue', text: 'Overdue' };
        } else if (Math.abs(diff) < 60000) {
            return { status: 'due', text: 'Due now!' };
        } else {
            // Format as Xd Xh Xm left
            let mins = Math.floor(diff / 60000);
            const days = Math.floor(mins / 1440);
            mins = mins % 1440;
            const hours = Math.floor(mins / 60);
            mins = mins % 60;
            let text = '';
            if (days > 0) text += `${days}d `;
            if (hours > 0) text += `${hours}h `;
            if (mins > 0) text += `${mins}m `;
            text = text.trim() + ' left';
            return { status: 'future', text };
        }
    }

    updateStats() {
        const totalTasks = this.todos.length;
        const completedTasks = this.todos.filter(t => t.completed).length;
        const activeTasks = totalTasks - completedTasks;

        const taskCount = document.getElementById('taskCount');
        taskCount.textContent = `${activeTasks} task${activeTasks !== 1 ? 's' : ''} remaining`;
    }

    toggleEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const todoContainer = document.querySelector('.todo-container');
        const todoList = document.getElementById('todoList');
        const todoStats = document.querySelector('.todo-stats');
        const inputSection = document.querySelector('.input-section');

        if (this.todos.length === 0) {
            emptyState.style.display = 'block';
            if (todoList) todoList.style.display = 'none';
            if (todoStats) todoStats.style.display = 'none';
            if (inputSection) inputSection.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            if (todoList) todoList.style.display = '';
            if (todoStats) todoStats.style.display = '';
            if (inputSection) inputSection.style.display = 'flex';
        }
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            case 'warning': return '#ffc107';
            default: return '#17a2b8';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
}); 