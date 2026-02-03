const STORAGE_KEYS = {
  users: "pp_users",
  session: "pp_session",
  calls: "pp_calls",
  units: "pp_units",
  logs: "pp_logs",
  settings: "pp_settings",
  scenes: "pp_scenes"
};

const elements = {
  authSection: document.getElementById("authSection"),
  dashboardSection: document.getElementById("dashboardSection"),
  sessionUser: document.getElementById("sessionUser"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  callForm: document.getElementById("callForm"),
  unitForm: document.getElementById("unitForm"),
  callsTable: document.getElementById("callsTable"),
  unitsList: document.getElementById("unitsList"),
  activityLog: document.getElementById("activityLog"),
  activeCallsCount: document.getElementById("activeCallsCount"),
  availableUnitsCount: document.getElementById("availableUnitsCount"),
  openIncidentsCount: document.getElementById("openIncidentsCount"),
  dispatchersOnline: document.getElementById("dispatchersOnline"),
  toast: document.getElementById("toast"),
  editModal: document.getElementById("editModal"),
  editCallForm: document.getElementById("editCallForm"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  startTimerBtn: document.getElementById("startTimerBtn"),
  pauseTimerBtn: document.getElementById("pauseTimerBtn"),
  resetTimerBtn: document.getElementById("resetTimerBtn"),
  sceneTimerDisplay: document.getElementById("sceneTimerDisplay"),
  sceneForm: document.getElementById("sceneForm"),
  sceneList: document.getElementById("sceneList"),
  logStatusBtn: document.getElementById("logStatusBtn"),
  clearLogBtn: document.getElementById("clearLogBtn"),
  seedCallBtn: document.getElementById("seedCallBtn"),
  settingsForm: document.getElementById("settingsForm")
};

const state = {
  users: [],
  session: null,
  calls: [],
  units: [],
  logs: [],
  editCallId: null,
  settings: {
    defaultPriority: "High",
    logLimit: 50,
    toastEnabled: true
  },
  scenes: [],
  timer: {
    seconds: 0,
    running: false,
    intervalId: null
  }
};

const loadData = () => {
  Object.keys(STORAGE_KEYS).forEach((key) => {
    const stored = localStorage.getItem(STORAGE_KEYS[key]);
    if (stored) {
      state[key] = JSON.parse(stored);
    }
  });

  if (state.units.length === 0) {
    state.units = [
      createUnit("Alpha-21", "Police"),
      createUnit("Engine-4", "Fire"),
      createUnit("Medic-12", "EMS")
    ];
    persist("units");
  }

  if (!state.logs || state.logs.length === 0) {
    state.logs = [];
    persist("logs");
  }

  if (!state.settings) {
    state.settings = {
      defaultPriority: "High",
      logLimit: 50,
      toastEnabled: true
    };
    persist("settings");
  }

  if (!state.scenes) {
    state.scenes = [];
    persist("scenes");
  }

  if (state.session) {
    const validSession = state.users.some((user) => user.id === state.session.id);
    if (!validSession) {
      state.session = null;
      persist("session");
    }
  }
};

const persist = (key) => {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(state[key]));
};

const createId = () => `ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const createCall = (data) => ({
  id: createId(),
  status: "Open",
  assignedUnits: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...data
});

const createUnit = (name, type) => ({
  id: createId(),
  name,
  type,
  status: "Available",
  assignedCall: null
});

const logActivity = (message, meta = {}) => {
  const entry = {
    id: createId(),
    message,
    createdAt: new Date().toISOString(),
    ...meta
  };
  state.logs.unshift(entry);
  state.logs = state.logs.slice(0, state.settings.logLimit);
  persist("logs");
  renderLogs();
};

const showToast = (message) => {
  if (!state.settings.toastEnabled) {
    return;
  }
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2500);
};

const openEditModal = (call) => {
  state.editCallId = call.id;
  elements.editCallForm.location.value = call.location;
  elements.editCallForm.description.value = call.description;
  elements.editModal.classList.add("show");
  elements.editModal.setAttribute("aria-hidden", "false");
};

const closeEditModal = () => {
  state.editCallId = null;
  elements.editModal.classList.remove("show");
  elements.editModal.setAttribute("aria-hidden", "true");
  elements.editCallForm.reset();
};

const renderSession = () => {
  if (state.session) {
    elements.sessionUser.textContent = `Signed in as ${state.session.displayName}`;
    elements.authSection.style.display = "none";
    elements.dashboardSection.style.display = "flex";
  } else {
    elements.sessionUser.textContent = "Not signed in";
    elements.authSection.style.display = "grid";
    elements.dashboardSection.style.display = "none";
  }
};

const renderStats = () => {
  const activeCalls = state.calls.filter((call) => call.status === "Open");
  const availableUnits = state.units.filter((unit) => unit.status === "Available");
  elements.activeCallsCount.textContent = activeCalls.length;
  elements.availableUnitsCount.textContent = availableUnits.length;
  elements.openIncidentsCount.textContent = activeCalls.length;
  elements.dispatchersOnline.textContent = state.session ? 1 : 0;
};

const renderCalls = () => {
  const header = `
    <div class="table-row header">
      <div>Call</div>
      <div>Location</div>
      <div>Priority</div>
      <div>Units</div>
      <div>Status</div>
      <div>Actions</div>
    </div>
  `;

  if (state.calls.length === 0) {
    elements.callsTable.innerHTML = `${header}<div class="card">No calls yet. Create one to start dispatching.</div>`;
    return;
  }

  const rows = state.calls
    .map((call) => {
      const priorityClass = call.priority.toLowerCase();
      const assignedUnits = call.assignedUnits
        .map((unitId) => state.units.find((unit) => unit.id === unitId))
        .filter(Boolean)
        .map((unit) => unit.name)
        .join(", ") || "None";

      const availableUnitOptions = state.units
        .filter((unit) => unit.status === "Available")
        .map(
          (unit) =>
            `<option value="${unit.id}">${unit.name} (${unit.type})</option>`
        )
        .join("");

      const actionButtons = `
        <div class="actions">
          <button type="button" data-action="close" data-id="${call.id}">Close</button>
          <button type="button" class="ghost" data-action="update" data-id="${call.id}">Update</button>
        </div>
      `;

      const assignButton = availableUnitOptions
        ? `<div class="actions">
            <select data-assign="${call.id}">
              <option value="">Assign Unit</option>
              ${availableUnitOptions}
            </select>
          </div>`
        : "<span class=\"helper\">No available units</span>";

      return `
        <div class="table-row">
          <div><strong>${call.type}</strong><br /><small>${call.description}</small></div>
          <div>${call.location}</div>
          <div><span class="badge ${priorityClass}">${call.priority}</span></div>
          <div>${assignedUnits}<br/>${assignButton}</div>
          <div>${call.status}</div>
          <div>${actionButtons}</div>
        </div>
      `;
    })
    .join("");

  elements.callsTable.innerHTML = header + rows;
};

const renderUnits = () => {
  if (state.units.length === 0) {
    elements.unitsList.innerHTML = "<div class=\"helper\">No units added.</div>";
    return;
  }

  elements.unitsList.innerHTML = state.units
    .map(
      (unit) => `
      <div class="unit">
        <div>
          <strong>${unit.name}</strong>
          <span>${unit.type} • ${unit.assignedCall ? "Assigned" : "Standby"}</span>
        </div>
        <div class="status ${unit.status === "Available" ? "available" : "assigned"}">${unit.status}</div>
      </div>
    `
    )
    .join("");
};

const renderLogs = () => {
  if (state.logs.length === 0) {
    elements.activityLog.innerHTML = "<div class=\"helper\">No activity logged yet.</div>";
    return;
  }

  elements.activityLog.innerHTML = state.logs
    .map(
      (log) => `
      <div class="log-entry">
        <strong>${log.message}</strong>
        <small>${new Date(log.createdAt).toLocaleString()}</small>
      </div>
    `
    )
    .join("");
};

const renderAll = () => {
  renderSession();
  renderStats();
  renderCalls();
  renderUnits();
  renderLogs();
  renderScenes();
  renderSettings();
  renderTimer();
};

const registerUser = (formData) => {
  const payload = Object.fromEntries(formData.entries());
  const exists = state.users.some((user) => user.username === payload.username);
  if (exists) {
    showToast("Username already exists.");
    return;
  }

  const user = {
    id: createId(),
    displayName: payload.displayName,
    username: payload.username,
    password: payload.password
  };
  state.users.push(user);
  persist("users");
  showToast("Account created. Please sign in.");
  logActivity(`New dispatcher registered: ${user.displayName}.`);
};

const loginUser = (formData) => {
  const payload = Object.fromEntries(formData.entries());
  const user = state.users.find(
    (entry) => entry.username === payload.username && entry.password === payload.password
  );

  if (!user) {
    showToast("Invalid credentials.");
    return;
  }

  state.session = {
    id: user.id,
    displayName: user.displayName,
    username: user.username
  };
  persist("session");
  renderAll();
  logActivity(`${user.displayName} signed in.`);
};

const logoutUser = () => {
  if (!state.session) {
    return;
  }
  logActivity(`${state.session.displayName} signed out.`);
  state.session = null;
  persist("session");
  renderAll();
};

const addCall = (formData) => {
  const payload = Object.fromEntries(formData.entries());
  const call = createCall({
    ...payload,
    priority: payload.priority || state.settings.defaultPriority
  });
  state.calls.unshift(call);
  persist("calls");
  renderAll();
  logActivity(`New ${call.priority} priority call created: ${call.type} at ${call.location}.`);
  showToast("Call created.");
};

const addUnit = (formData) => {
  const payload = Object.fromEntries(formData.entries());
  const unit = createUnit(payload.name, payload.type);
  state.units.push(unit);
  persist("units");
  renderAll();
  logActivity(`Unit ${unit.name} (${unit.type}) added to roster.`);
  showToast("Unit added.");
};

const closeCall = (callId) => {
  const call = state.calls.find((entry) => entry.id === callId);
  if (!call) {
    return;
  }
  call.status = "Closed";
  call.updatedAt = new Date().toISOString();
  call.assignedUnits.forEach((unitId) => {
    const unit = state.units.find((entry) => entry.id === unitId);
    if (unit) {
      unit.status = "Available";
      unit.assignedCall = null;
    }
  });
  call.assignedUnits = [];
  persist("calls");
  persist("units");
  renderAll();
  logActivity(`Call ${call.type} at ${call.location} closed.`);
  showToast("Call closed.");
};

const updateCall = (callId) => {
  const call = state.calls.find((entry) => entry.id === callId);
  if (!call) {
    return;
  }
  openEditModal(call);
};

const assignUnitToCall = (callId, unitId) => {
  const call = state.calls.find((entry) => entry.id === callId);
  const unit = state.units.find((entry) => entry.id === unitId);
  if (!call || !unit) {
    return;
  }

  unit.status = "Assigned";
  unit.assignedCall = call.id;
  call.assignedUnits.push(unit.id);
  call.updatedAt = new Date().toISOString();
  persist("calls");
  persist("units");
  renderAll();
  logActivity(`${unit.name} assigned to ${call.type} at ${call.location}.`);
  showToast("Unit assigned.");
};

const renderScenes = () => {
  if (!state.scenes.length) {
    elements.sceneList.innerHTML = "<div class=\"helper\">No scenes saved yet.</div>";
    return;
  }

  elements.sceneList.innerHTML = state.scenes
    .map(
      (scene) => `
      <div class="unit">
        <div>
          <strong>${scene.name}</strong>
          <span>${scene.notes}</span>
        </div>
        <button type="button" class="ghost" data-scene="${scene.id}">Activate</button>
      </div>
    `
    )
    .join("");
};

const renderSettings = () => {
  if (!elements.settingsForm) {
    return;
  }
  elements.settingsForm.defaultPriority.value = state.settings.defaultPriority;
  elements.settingsForm.logLimit.value = state.settings.logLimit;
  elements.settingsForm.toastEnabled.checked = state.settings.toastEnabled;
  if (elements.callForm) {
    elements.callForm.priority.value = state.settings.defaultPriority;
  }
};

const renderTimer = () => {
  const minutes = String(Math.floor(state.timer.seconds / 60)).padStart(2, "0");
  const seconds = String(state.timer.seconds % 60).padStart(2, "0");
  elements.sceneTimerDisplay.textContent = `${minutes}:${seconds}`;
  elements.startTimerBtn.disabled = state.timer.running;
  elements.pauseTimerBtn.disabled = !state.timer.running;
};

const startTimer = () => {
  if (state.timer.running) {
    return;
  }
  state.timer.running = true;
  state.timer.intervalId = window.setInterval(() => {
    state.timer.seconds += 1;
    renderTimer();
  }, 1000);
  renderTimer();
};

const pauseTimer = () => {
  if (!state.timer.running) {
    return;
  }
  state.timer.running = false;
  window.clearInterval(state.timer.intervalId);
  state.timer.intervalId = null;
  renderTimer();
};

const resetTimer = () => {
  pauseTimer();
  state.timer.seconds = 0;
  renderTimer();
};

const addScene = (formData) => {
  const payload = Object.fromEntries(formData.entries());
  const scene = {
    id: createId(),
    name: payload.sceneName,
    notes: payload.sceneNotes
  };
  state.scenes.unshift(scene);
  persist("scenes");
  renderScenes();
  logActivity(`Scene preset added: ${scene.name}.`);
  showToast("Scene added.");
};

const activateScene = (sceneId) => {
  const scene = state.scenes.find((item) => item.id === sceneId);
  if (!scene) {
    return;
  }
  logActivity(`Scene activated: ${scene.name}. Notes: ${scene.notes}`);
  showToast("Scene activated.");
};

const saveSettings = (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(elements.settingsForm).entries());
  state.settings = {
    defaultPriority: payload.defaultPriority,
    logLimit: Number(payload.logLimit),
    toastEnabled: payload.toastEnabled === "on"
  };
  persist("settings");
  renderAll();
  showToast("Settings saved.");
};

const clearLogs = () => {
  state.logs = [];
  persist("logs");
  renderLogs();
  showToast("Activity log cleared.");
};

const seedDemoCall = () => {
  const call = createCall({
    location: "101 Ocean Ave",
    type: "Disturbance",
    priority: state.settings.defaultPriority,
    description: "Reported loud argument in progress."
  });
  state.calls.unshift(call);
  persist("calls");
  renderCalls();
  renderStats();
  logActivity("Demo call seeded by dispatcher.");
  showToast("Demo call created.");
};

const saveCallUpdates = (event) => {
  event.preventDefault();
  const call = state.calls.find((entry) => entry.id === state.editCallId);
  if (!call) {
    closeEditModal();
    return;
  }

  const formData = new FormData(elements.editCallForm);
  const payload = Object.fromEntries(formData.entries());
  call.location = payload.location.trim() || call.location;
  call.description = payload.description.trim() || call.description;
  call.updatedAt = new Date().toISOString();
  persist("calls");
  renderAll();
  logActivity(`Call ${call.type} updated by dispatcher.`);
  showToast("Call updated.");
  closeEditModal();
};

const handleCallTableClick = (event) => {
  const action = event.target.getAttribute("data-action");
  const callId = event.target.getAttribute("data-id");
  if (!action || !callId) {
    return;
  }

  if (action === "close") {
    closeCall(callId);
  }

  if (action === "update") {
    updateCall(callId);
  }
};

const handleAssignSelect = (event) => {
  const select = event.target.closest("select");
  if (!select || !select.dataset.assign) {
    return;
  }
  const callId = select.dataset.assign;
  const unitId = select.value;
  if (!unitId) {
    return;
  }
  assignUnitToCall(callId, unitId);
};

const initialize = () => {
  loadData();
  renderAll();

  elements.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginUser(new FormData(event.target));
    event.target.reset();
  });

  elements.registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    registerUser(new FormData(event.target));
    event.target.reset();
  });

  elements.logoutBtn.addEventListener("click", () => logoutUser());

  elements.callForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.session) {
      showToast("Please sign in to create calls.");
      return;
    }
    addCall(new FormData(event.target));
    event.target.reset();
  });

  elements.unitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.session) {
      showToast("Please sign in to add units.");
      return;
    }
    addUnit(new FormData(event.target));
    event.target.reset();
  });

  elements.callsTable.addEventListener("click", handleCallTableClick);
  elements.callsTable.addEventListener("change", handleAssignSelect);
  elements.editCallForm.addEventListener("submit", saveCallUpdates);
  elements.closeModalBtn.addEventListener("click", closeEditModal);
  elements.cancelModalBtn.addEventListener("click", closeEditModal);
  elements.editModal.addEventListener("click", (event) => {
    if (event.target === elements.editModal) {
      closeEditModal();
    }
  });
  elements.startTimerBtn.addEventListener("click", startTimer);
  elements.pauseTimerBtn.addEventListener("click", pauseTimer);
  elements.resetTimerBtn.addEventListener("click", resetTimer);
  elements.sceneForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addScene(new FormData(event.target));
    event.target.reset();
  });
  elements.sceneList.addEventListener("click", (event) => {
    const sceneId = event.target.getAttribute("data-scene");
    if (sceneId) {
      activateScene(sceneId);
    }
  });
  elements.logStatusBtn.addEventListener("click", () => {
    if (!state.session) {
      showToast("Please sign in to log status.");
      return;
    }
    logActivity(`Dispatcher status check logged by ${state.session.displayName}.`);
    showToast("Status check logged.");
  });
  elements.clearLogBtn.addEventListener("click", clearLogs);
  elements.seedCallBtn.addEventListener("click", seedDemoCall);
  elements.settingsForm.addEventListener("submit", saveSettings);
};

initialize();
