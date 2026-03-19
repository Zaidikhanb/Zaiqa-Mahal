// API base URL (relative for Vercel)
const API_BASE = '/api';

// Utility to format time from ISO
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Utility to format date
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString();
}

// Load employees and today's attendance for attendance page
async function loadEmployeesWithAttendance() {
    const grid = document.getElementById('employeeGrid');
    const dateToday = new Date().toISOString().split('T')[0];
    document.querySelector('.date-today').textContent = `Date: ${new Date().toLocaleDateString()}`;

    try {
        // Fetch employees and today's attendance in parallel
        const [employeesRes, attendanceRes] = await Promise.all([
            fetch(`${API_BASE}/employees`),
            fetch(`${API_BASE}/attendance?date=${dateToday}`)
        ]);

        if (!employeesRes.ok || !attendanceRes.ok) throw new Error('Failed to load data');

        const employees = await employeesRes.json();
        const attendanceRecords = await attendanceRes.json();

        // Create a map of employeeId -> attendance record for today
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
            attendanceMap.set(record.employeeId, record);
        });

        // Build employee cards
        grid.innerHTML = employees.map(emp => {
            const attended = attendanceMap.has(emp._id);
            const record = attendanceMap.get(emp._id);
            const timeStr = record ? formatTime(record.timestamp) : '';

            return `
                <div class="employee-card" data-id="${emp._id}">
                    <h3>${emp.name}</h3>
                    <div class="employee-id">ID: ${emp.employeeId}</div>
                    <button class="btn-present" ${attended ? 'disabled' : ''} onclick="markPresent('${emp._id}')">
                        ${attended ? 'Present' : 'Mark Present'}
                    </button>
                    ${attended ? `<div class="attendance-time">at ${timeStr}</div>` : ''}
                </div>
            `;
        }).join('');

    } catch (error) {
        grid.innerHTML = `<div class="error">Error loading employees: ${error.message}</div>`;
    }
}

// Mark attendance for an employee
async function markPresent(employeeId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Processing...';

    try {
        const timestamp = new Date().toISOString(); // device time

        const response = await fetch(`${API_BASE}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, timestamp })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to mark attendance');
        }

        // Update UI to show attendance recorded
        const card = button.closest('.employee-card');
        const timeStr = formatTime(timestamp);
        button.textContent = 'Present';
        button.disabled = true;
        // Add time display if not exists
        if (!card.querySelector('.attendance-time')) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'attendance-time';
            timeDiv.textContent = `at ${timeStr}`;
            card.appendChild(timeDiv);
        }

        // Show success message (optional)
        showMessage('Attendance marked successfully', 'success');

    } catch (error) {
        button.disabled = false;
        button.textContent = 'Mark Present';
        showMessage(error.message, 'error');
    }
}

// Load all attendance records for admin (no filter)
async function loadAllAttendance() {
    const tbody = document.getElementById('attendanceBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading records...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/attendance?all=true`);
        if (!response.ok) throw new Error('Failed to load attendance');

        const records = await response.json();
        renderAttendanceTable(records);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="error">Error: ${error.message}</td></tr>`;
    }
}

// Filter attendance by date
async function filterByDate() {
    const dateInput = document.getElementById('dateFilter');
    const date = dateInput.value;
    if (!date) return;

    const tbody = document.getElementById('attendanceBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading records...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/attendance?date=${date}`);
        if (!response.ok) throw new Error('Failed to load attendance');

        const records = await response.json();
        renderAttendanceTable(records);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="error">Error: ${error.message}</td></tr>`;
    }
}

// Render attendance table rows
function renderAttendanceTable(records) {
    const tbody = document.getElementById('attendanceBody');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No records found</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.employeeName || 'Unknown'}</td>
            <td>${formatDate(record.timestamp)}</td>
            <td>${formatTime(record.timestamp)}</td>
            <td><span style="color:#27ae60; font-weight:600;">Present</span></td>
        </tr>
    `).join('');
}

// Helper to show temporary messages
function showMessage(msg, type) {
    const existing = document.querySelector('.flash-message');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = `flash-message ${type === 'success' ? 'success-message' : 'error'}`;
    div.textContent = msg;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.padding = '10px 20px';
    div.style.borderRadius = '5px';
    div.style.zIndex = '1000';
    div.style.animation = 'fadeOut 3s forwards';
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 3000);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);
