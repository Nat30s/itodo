(function() {
    let currentColumnId = null;
    let editingTaskId = null;
    let saveTimeout = null;
    let boardCounter = 0;
    let dragCounter = 0;

    // Initialize boards
    window.addEventListener('load', () => {
        loadTasks();
        if (boardCounter === 0) {
            createBoard(`board-0`);
            boardCounter++;
            saveTasks();
        }
    });

    // Board management
    window.duplicateBoard = function() {
        createBoard(`board-${boardCounter}`);
        boardCounter++;
        saveTasks();
    };

    function createBoard(boardId) {
        const board = document.createElement('div');
        board.className = 'flex space-x-4 kanban-board';
        board.innerHTML = `
            <section class="bg-white rounded-lg shadow-lg p-4 w-80 border-2 border-transparent transition-all"
                     id="${boardId}-backlog"
                     ondrop="drop(event)"
                     ondragover="allowDrop(event)"
                     ondragenter="highlightColumn(event)"
                     ondragleave="unhighlightColumn(event)">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-gray-600 font-semibold editable-column"
                        data-column="${boardId}-backlog"
                        contenteditable="true">BACKLOG</h2>
                    <button aria-label="Add task" class="text-gray-500 hover:text-gray-700"
                            onclick="openTaskPopup('${boardId}-backlog')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="space-y-4 drop-zone relative" id="${boardId}-backlog-tasks"></div>
            </section>

            <section class="bg-white rounded-lg shadow-lg p-4 w-80 border-2 border-transparent transition-all"
                     id="${boardId}-todo"
                     ondrop="drop(event)"
                     ondragover="allowDrop(event)"
                     ondragenter="highlightColumn(event)"
                     ondragleave="unhighlightColumn(event)">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-gray-600 font-semibold editable-column"
                        data-column="${boardId}-todo"
                        contenteditable="true">TO DO</h2>
                    <button aria-label="Add task" class="text-gray-500 hover:text-gray-700"
                            onclick="openTaskPopup('${boardId}-todo')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="space-y-4 drop-zone relative" id="${boardId}-todo-tasks"></div>
            </section>

            <section class="bg-white rounded-lg shadow-lg p-4 w-80 border-2 border-transparent transition-all"
                     id="${boardId}-in-review"
                     ondrop="drop(event)"
                     ondragover="allowDrop(event)"
                     ondragenter="highlightColumn(event)"
                     ondragleave="unhighlightColumn(event)">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-gray-600 font-semibold editable-column"
                        data-column="${boardId}-in-review"
                        contenteditable="true">IN REVIEW</h2>
                    <button aria-label="Add task" class="text-gray-500 hover:text-gray-700"
                            onclick="openTaskPopup('${boardId}-in-review')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="space-y-4 drop-zone relative" id="${boardId}-in-review-tasks"></div>
            </section>
        `;

        // Add column name editing
        const columns = board.querySelectorAll('.editable-column');
        columns.forEach(column => {
            column.addEventListener('blur', () => {
                saveTasks();
            });
            column.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    column.blur();
                }
            });
        });

        document.getElementById('boards-container').appendChild(board);
    }

    // Task management
    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
    }

    window.openTaskPopup = function(columnId) {
        currentColumnId = columnId;
        const modal = document.getElementById('add-task-modal');
        modal.classList.remove('hidden');
        document.getElementById('task-title').focus();
        document.addEventListener('keydown', handleEscKey);
    };

    window.closeTaskPopup = function() {
        const modal = document.getElementById('add-task-modal');
        modal.classList.add('hidden');
        document.getElementById('task-form').reset();
        editingTaskId = null;
        clearValidationErrors();
        document.removeEventListener('keydown', handleEscKey);
    };

    function handleEscKey(event) {
        if (event.key === 'Escape') {
            closeTaskPopup();
        }
    }

    function clearValidationErrors() {
        document.getElementById('title-error').classList.add('hidden');
        document.getElementById('description-error').classList.add('hidden');
    }

    document.getElementById('task-form').onsubmit = function(event) {
        event.preventDefault();
        clearValidationErrors();

        const titleInput = document.getElementById('task-title');
        const descInput = document.getElementById('task-description');
        const title = escapeHtml(titleInput.value.trim());
        const description = escapeHtml(descInput.value.trim());

        if (!title) {
            document.getElementById('title-error').classList.remove('hidden');
            titleInput.focus();
            return;
        }

        if (title.length > 50) {
            document.getElementById('title-error').textContent = 'Title cannot exceed 50 characters';
            document.getElementById('title-error').classList.remove('hidden');
            titleInput.focus();
            return;
        }

        if (description.length > 200) {
            document.getElementById('description-error').classList.remove('hidden');
            descInput.focus();
            return;
        }

        const newTask = {
            id: editingTaskId || crypto.randomUUID(),
            title: title,
            description: description,
            columnId: currentColumnId,
        };

        if (editingTaskId) {
            document.querySelector(`[data-task-id="${editingTaskId}"]`).remove();
            editingTaskId = null;
        }

        addTaskToColumn(newTask);
        saveTasks();
        closeTaskPopup();
    };

    function addTaskToColumn(task) {
        const column = document.getElementById(`${task.columnId}-tasks`);
        if (!column) return;

        const taskElement = document.createElement('div');
        taskElement.className = 'task-card bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4 transition-transform';
        taskElement.setAttribute('draggable', true);
        taskElement.dataset.taskId = task.id;
        taskElement.innerHTML = `
            <h3 class="text-gray-800 font-semibold mb-2">${task.title}</h3>
            <p class="text-gray-600">${task.description}</p>
            <div class="flex justify-end space-x-3 mt-2">
                <button class="text-gray-400 hover:text-gray-600 edit-btn transition-colors" title="Edit">
                    <i class="fas fa-pencil-alt text-sm"></i>
                </button>
                <button class="text-gray-400 hover:text-gray-600 duplicate-btn transition-colors" title="Duplicate">
                    <i class="fas fa-clone text-sm"></i>
                </button>
                <button class="text-gray-400 hover:text-gray-600 delete-btn transition-colors" title="Delete">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
        `;

        column.appendChild(taskElement);

        taskElement.addEventListener('dragstart', () => {
            taskElement.classList.add('dragging');
            taskElement.style.border = 'none';
            setTimeout(() => taskElement.classList.add('opacity-50'), 0);
        });

        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging', 'opacity-50');
            taskElement.style.border = '';
            saveTasks();
        });
    }

    // Event delegation
    document.addEventListener('click', (event) => {
        const taskElement = event.target.closest('.bg-white');
        if (!taskElement) return;

        const button = event.target.closest('button');
        if (!button) return;

        if (button.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this task?')) {
                taskElement.remove();
                saveTasks();
            }
        } else if (button.classList.contains('edit-btn')) {
            editingTaskId = taskElement.dataset.taskId;
            document.getElementById('task-title').value = taskElement.querySelector('h3').textContent;
            document.getElementById('task-description').value = taskElement.querySelector('p').textContent;
            openTaskPopup(taskElement.parentElement.parentElement.id);
        } else if (button.classList.contains('duplicate-btn')) {
            const originalTask = {
                id: crypto.randomUUID(),
                title: taskElement.querySelector('h3').textContent,
                description: taskElement.querySelector('p').textContent,
                columnId: taskElement.parentElement.parentElement.id
            };
            addTaskToColumn(originalTask);
            saveTasks();
        }
    });

    // Drag and drop
    window.highlightColumn = function(event) {
        const section = event.currentTarget;
        dragCounter++;
        section.classList.add('drag-over-column');
    };

    window.unhighlightColumn = function(event) {
        const section = event.currentTarget;
        dragCounter--;
        if (dragCounter === 0) {
            section.classList.remove('drag-over-column');
        }
    };

    window.allowDrop = function(event) {
        event.preventDefault();
        if (!event.currentTarget.classList.contains('drag-over-column')) {
            highlightColumn(event);
        }
    };

    window.drop = function(event) {
        event.preventDefault();
        const section = event.currentTarget;
        dragCounter = 0;
        section.classList.remove('drag-over-column');

        const draggable = document.querySelector('.dragging');
        if (!draggable) return;

        const afterElement = getDragAfterElement(section.querySelector('.drop-zone'), event.clientY);
        const targetColumn = section.querySelector('.drop-zone');

        if (afterElement) {
            targetColumn.insertBefore(draggable, afterElement);
        } else {
            targetColumn.appendChild(draggable);
        }
        saveTasks();
    };

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.bg-white:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Data persistence
    function saveTasks() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const data = {
                boards: boardCounter,
                tasks: [],
                columns: {}
            };

            document.querySelectorAll('.kanban-board').forEach(board => {
                board.querySelectorAll('section').forEach(section => {
                    const columnId = section.id;
                    const columnName = section.querySelector('.editable-column').textContent;

                    // Save column name
                    data.columns[columnId] = columnName;

                    // Save tasks
                    section.querySelectorAll('.bg-white').forEach(taskElement => {
                        data.tasks.push({
                            id: taskElement.dataset.taskId,
                            title: taskElement.querySelector('h3').textContent,
                            description: taskElement.querySelector('p').textContent,
                            columnId: columnId
                        });
                    });
                });
            });

            try {
                localStorage.setItem('kanbanData', JSON.stringify(data));
            } catch (e) {
                console.error('Storage error:', e);
            }
        }, 500);
    }

    function loadTasks() {
        try {
            const data = JSON.parse(localStorage.getItem('kanbanData')) || { boards: 0, tasks: [], columns: {} };
            boardCounter = data.boards || 0;

            // Create boards
            for (let i = 0; i < boardCounter; i++) {
                createBoard(`board-${i}`);
            }

            // Restore column names
            Object.entries(data.columns).forEach(([columnId, columnName]) => {
                const columnHeader = document.querySelector(`[data-column="${columnId}"]`);
                if (columnHeader) {
                    columnHeader.textContent = columnName;
                }
            });

            // Load tasks
            data.tasks.forEach(task => {
                const column = document.getElementById(`${task.columnId}-tasks`);
                if (column) {
                    addTaskToColumn(task);
                }
            });
        } catch (e) {
            console.error('Failed to load tasks:', e);
        }
    }

    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
        if(confirm('Save all data as backup file?')) {
            const data = JSON.parse(localStorage.getItem('kanbanData')) || { boards: 0, tasks: [], columns: {} };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `kanban-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    // Import
    document.getElementById('importBtn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = e => {
            if(confirm('This will overwrite current data. Continue?')) {
                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onload = event => {
                    try {
                        const data = JSON.parse(event.target.result);
                        localStorage.setItem('kanbanData', JSON.stringify(data));
                        location.reload();
                    } catch (error) {
                        alert('Invalid file format. Please use exported backup files.');
                    }
                };

                reader.readAsText(file);
            }
        };

        input.click();
    });
})();
