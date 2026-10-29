import "./style.css";

const STORAGE_KEY = "braid-bookings";
const THEME_KEY = "braid-theme";
const MAX_LENGTH = 100;

const FILTER_BASE =
  "rounded-full px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500";
const FILTER_ON = "bg-plum-900 text-gold-400 shadow dark:bg-gold-400 dark:text-plum-950";
const FILTER_OFF =
  "text-plum-700 hover:text-plum-950 dark:text-lilac-200 dark:hover:text-white";

// ---------- State ----------
let tasks = [];
let filter = "all";
let searchTerm = "";
let pendingDeleteId = null;

// ---------- DOM references ----------
const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const errorBox = document.querySelector("#error");
const searchInput = document.querySelector("#search-input");
const filterBar = document.querySelector("#filters");
const filterButtons = document.querySelectorAll("[data-filter]");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const counter = document.querySelector("#counter");
const clearBtn = document.querySelector("#clear-completed");
const dialog = document.querySelector("#confirm-dialog");
const confirmText = document.querySelector("#confirm-text");
const themeBtn = document.querySelector("#theme-toggle");

// ---------- Storage ----------

// Save the tasks and the selected filter to localStorage.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, filter }));
  } catch (error) {
    console.error("Could not save tasks:", error);
  }
}

// Load the tasks and the selected filter from localStorage.
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks)) {
      tasks = saved.tasks;
      const valid = ["all", "active", "completed"];
      filter = valid.includes(saved.filter) ? saved.filter : "all";
    }
  } catch (error) {
    tasks = [];
  }
}

// ---------- State changes ----------

// Run a change to the state, then save and redraw the screen.
function updateState(changeFn) {
  changeFn();
  saveTasks();
  render();
}

// Return an error message for invalid task text, or "" if it is fine.
function validateText(text) {
  if (text === "") return "Please type a task before saving.";
  if (text.length > MAX_LENGTH) {
    return `Keep it under ${MAX_LENGTH} characters (now ${text.length}).`;
  }
  return "";
}

// Show an error message on the page (an empty string clears it).
function showError(message) {
  errorBox.textContent = message;
}

// Add a new task if the text is valid; return true when it worked.
function addTask(text) {
  const message = validateText(text);
  showError(message);
  if (message !== "") return false;
  updateState(() => {
    tasks.push({ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() });
  });
  return true;
}

// Flip the done value of one task.
function toggleTask(id) {
  updateState(() => {
    const task = tasks.find((item) => item.id === id);
    if (task) task.done = !task.done;
  });
}

// Remove one task from the array.
function deleteTask(id) {
  updateState(() => {
    tasks = tasks.filter((item) => item.id !== id);
  });
}

// Change the text of one task if the new text is valid.
function editTask(id, text) {
  const message = validateText(text);
  showError(message);
  if (message !== "") return false;
  updateState(() => {
    const task = tasks.find((item) => item.id === id);
    if (task) task.text = text;
  });
  return true;
}

// Remove every completed task.
function clearCompleted() {
  updateState(() => {
    tasks = tasks.filter((item) => !item.done);
  });
}

// Change the selected filter (all, active or completed).
function setFilter(name) {
  updateState(() => {
    filter = name;
  });
}

// Return the tasks that match the current filter and search text.
function getVisibleTasks() {
  return tasks.filter((task) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && !task.done) ||
      (filter === "completed" && task.done);
    const matchesSearch = task.text.toLowerCase().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });
}

// ---------- Rendering ----------

// Build one small icon button with an accessible label.
function createButton(label, action, symbol) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  button.textContent = symbol;
  button.className =
    "grid size-9 shrink-0 place-items-center rounded-full text-plum-700 transition hover:bg-lilac-100 hover:text-magenta-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:text-lilac-200 dark:hover:bg-plum-700 dark:hover:text-gold-400";
  return button;
}

// Build the <li> for one task using textContent only (no innerHTML).
function createTaskItem(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;
  const accent = task.done ? "border-mint-500" : "border-magenta-600";
  li.className = `flex items-center gap-3 rounded-2xl border-l-8 ${accent} bg-white py-2.5 pl-4 pr-2 shadow-sm transition dark:bg-plum-800`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as done`);
  checkbox.className =
    "check size-6 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-plum-700 transition checked:border-mint-500 checked:bg-mint-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-lilac-200";

  const text = document.createElement("span");
  text.dataset.role = "text";
  text.textContent = task.text;
  text.className = task.done
    ? "flex-1 break-words text-plum-700/60 line-through decoration-2 dark:text-lilac-200/50"
    : "flex-1 break-words font-medium";

  li.append(checkbox, text);
  li.append(createButton("Edit task", "edit", "✎"));
  li.append(createButton("Delete task", "delete", "✕"));
  return li;
}

// Return the empty-state message that fits the current view.
function getEmptyMessage() {
  if (searchTerm !== "") return "No tasks match your search.";
  if (filter === "completed") return "Nothing finished yet. Completed braids will show up here.";
  if (filter === "active") return "All caught up. No tasks left!";
  return "No tasks yet. Add your first appointment above.";
}

// Draw the list of visible tasks and the empty state.
function renderList() {
  const visible = getVisibleTasks();
  list.replaceChildren(...visible.map(createTaskItem));
  emptyState.hidden = visible.length > 0;
  emptyState.textContent = getEmptyMessage();
}

// Highlight the active filter button.
function renderFilters() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.setAttribute("aria-pressed", String(isActive));
    button.className = `${FILTER_BASE} ${isActive ? FILTER_ON : FILTER_OFF}`;
  });
}

// Update the "tasks left" counter and the Clear completed button.
function renderCounter() {
  const left = tasks.filter((task) => !task.done).length;
  counter.textContent = `${left} ${left === 1 ? "task" : "tasks"} left`;
  clearBtn.disabled = tasks.every((task) => !task.done);
}

// Redraw the whole screen from the state.
function render() {
  renderList();
  renderFilters();
  renderCounter();
}

// ---------- Editing in place ----------

// Replace a task's text with an input so it can be edited.
function startEdit(li) {
  const span = li.querySelector('[data-role="text"]');
  if (!span) return;
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = span.textContent;
  editInput.dataset.role = "edit-input";
  editInput.setAttribute("aria-label", "Edit task text. Enter saves, Escape cancels.");
  editInput.className =
    "min-w-0 flex-1 rounded-lg border-2 border-magenta-600 bg-white px-2 py-1 text-plum-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/40";
  span.replaceWith(editInput);
  editInput.focus();
  editInput.select();
}

// Save with Enter or cancel with Escape while editing a task.
function handleEditKey(event) {
  if (event.target.dataset.role !== "edit-input") return;
  const id = event.target.closest("li").dataset.id;
  if (event.key === "Escape") {
    showError("");
    render();
  }
  if (event.key === "Enter") {
    editTask(id, event.target.value.trim());
  }
}

// ---------- Event handlers ----------

// Put keyboard focus back on a control after the list is redrawn.
function focusControl(id, action) {
  const selector = `[data-id="${id}"] [data-action="${action}"]`;
  const control = list.querySelector(selector);
  if (control) control.focus();
}

// Ask for confirmation before deleting a task.
function openDeleteDialog(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  pendingDeleteId = id;
  confirmText.textContent = `Delete "${task.text}"?`;
  dialog.showModal();
}

// Delete the task only if the user pressed Delete in the dialog.
function handleDialogClose() {
  if (dialog.returnValue === "confirm" && pendingDeleteId !== null) {
    deleteTask(pendingDeleteId);
  }
  pendingDeleteId = null;
  dialog.returnValue = "";
}

// One click listener for the whole list (event delegation).
function handleListClick(event) {
  const control = event.target.closest("[data-action]");
  const li = event.target.closest("li");
  if (!control || !li) return;
  const id = li.dataset.id;
  const action = control.dataset.action;
  if (action === "toggle") {
    toggleTask(id);
    focusControl(id, "toggle");
  }
  if (action === "edit") startEdit(li);
  if (action === "delete") openDeleteDialog(id);
}

// Double-clicking a task's text starts editing it.
function handleListDblClick(event) {
  const li = event.target.closest("li");
  if (li && event.target.dataset.role === "text") startEdit(li);
}

// Add a task when the form is submitted (Enter or the Add button).
function handleSubmit(event) {
  event.preventDefault();
  if (addTask(input.value.trim())) input.value = "";
  input.focus();
}

// Filter the list as the user types in the search box.
function handleSearch(event) {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
}

// Change the filter when a filter button is clicked.
function handleFilterClick(event) {
  const button = event.target.closest("[data-filter]");
  if (button) setFilter(button.dataset.filter);
}

// ---------- Dark mode ----------

// Apply the light or dark theme to the page.
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  themeBtn.setAttribute("aria-pressed", String(isDark));
  themeBtn.textContent = isDark ? "Light" : "Dark";
}

// Read the saved theme (or the system preference) and apply it.
function loadTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (error) {
    saved = null;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ?? (prefersDark ? "dark" : "light"));
}

// Switch between light and dark and remember the choice.
function toggleTheme() {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    console.error("Could not save theme:", error);
  }
  applyTheme(next);
}

// ---------- Start the app ----------

// Load saved data, attach all event listeners, and draw the first screen.
function init() {
  loadTheme();
  loadTasks();
  form.addEventListener("submit", handleSubmit);
  searchInput.addEventListener("input", handleSearch);
  filterBar.addEventListener("click", handleFilterClick);
  list.addEventListener("click", handleListClick);
  list.addEventListener("dblclick", handleListDblClick);
  list.addEventListener("keydown", handleEditKey);
  clearBtn.addEventListener("click", clearCompleted);
  dialog.addEventListener("close", handleDialogClose);
  themeBtn.addEventListener("click", toggleTheme);
  render();
}

init();
