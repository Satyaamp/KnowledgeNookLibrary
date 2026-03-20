//  Manage Students: studentsPerPage
// Verify Aadhar: aadharPerPage
// Verify Fees: feesPerPage
// Manage Issues: issuesPerPage
// Interested Students: interestedPerPage
// Profile Requests: requestsPerPage
// Announcements: announcementsAdminPerPage
// Payment History: paymentHistoryPerPage




// Auth Check
if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'admin') {
    window.location.href = '/';
}
// Students Paginations
let currentStudents = [];
let filteredStudents = [];
let currentStudentsPage = 1;
const studentsPerPage = 10;
let searchTimeout = null;

// Verify Fees Paginations
let currentFees = [];
let filteredFees = [];
let currentFeesPage = 1;
const feesPerPage = 10;

// Issues Paginations
let currentIssues = [];
let filteredIssues = [];
let currentIssuesPage = 1;
const issuesPerPage = 10;

async function loadDashboardStats() {
 
    try {
        const stats = await apiFetch('/admin/dashboard-stats');
        
        if (document.getElementById('stat-total-students')) {
            document.getElementById('stat-total-students').textContent = stats.totalStudents || 0;
            document.getElementById('stat-active-students').textContent = stats.activeStudents || 0;
            document.getElementById('stat-inactive-students').textContent = stats.inactiveStudents || 0;
            document.getElementById('stat-pending-students').textContent = stats.pendingStudents || 0;
            document.getElementById('stat-pending-fees').textContent = stats.pendingFees || 0;
            document.getElementById('stat-open-issues').textContent = stats.openIssues || 0;
            document.getElementById('stat-pending-requests').textContent = stats.pendingProfileRequests || 0;
            document.getElementById('stat-pending-leads').textContent = stats.pendingLeads || 0;
            if (document.getElementById('stat-pending-aadhar')) document.getElementById('stat-pending-aadhar').textContent = stats.pendingAadhar || 0;
            if (document.getElementById('stat-verified-aadhar')) document.getElementById('stat-verified-aadhar').textContent = stats.verifiedAadhar || 0;
            if (document.getElementById('stat-notuploaded-aadhar')) document.getElementById('stat-notuploaded-aadhar').textContent = stats.notUploadedAadhar || 0;
            document.getElementById('stat-total-revenue').textContent = '₹' + (stats.totalRevenue || 0).toLocaleString('en-IN');
        }

        // Global Nav Badges Update
        updateNavBadge('students', stats.pendingStudents || 0);
        updateNavBadge('aadhar', stats.pendingAadhar || 0);
        updateNavBadge('leads', stats.pendingLeads || 0);
        updateNavBadge('fees', stats.pendingFees || 0);
        updateNavBadge('issues', stats.openIssues || 0);
        updateNavBadge('requests', stats.pendingProfileRequests || 0);
        

        // Distribution Stats (Batch & Plan)
        const distContainer = document.getElementById('distribution-stats-container');
        if (stats.distribution && stats.distribution.length > 0) {
            distContainer.innerHTML = stats.distribution.map(d => `
                <div style="border: 1px solid var(--card-border); border-radius: 8px; overflow: hidden; background: var(--card-bg);">
                    <div style="background: var(--bg-color); padding: 12px 15px; border-bottom: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" onclick="showStudentsByBatchPlan('${d.batch}', '')" onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='var(--bg-color)'" title="View all ${d.batch} students">
                        <strong style="color: var(--primary-color); font-size: 1.05em;">${d.batch}</strong>
                        <span style="font-size: 0.8em; background: var(--primary-light); color: var(--primary-color); padding: 2px 8px; border-radius: 10px; font-weight: 600;">Total: ${d.total}</span>
                    </div>
                    <div style="padding: 12px 15px;">
                        ${d.plans.map(p => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--card-border); cursor: pointer; transition: transform 0.2s;" onclick="showStudentsByBatchPlan('${d.batch}', '${p.name}')" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='none'" title="View ${d.batch} - ${p.name} students">
                                <span style="font-size: 0.9em; color: var(--text-secondary);">${p.name}</span>
                                <span style="font-weight: 600; font-size: 0.95em; ${p.count > 0 ? 'color: var(--success-color);' : 'color: var(--text-secondary);'}">${p.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        } else {
            distContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No distribution data available.</p>';
        }

        // Gender Stats
        const genderContainer = document.getElementById('gender-stats-container');
        if (stats.genderStats && stats.genderStats.length > 0) {
            genderContainer.innerHTML = stats.genderStats.map(g => {
                const gId = g._id || 'Not Specified';
                return `
                <div style="flex: 1; border: 1px solid var(--card-border); padding: 15px; border-radius: 8px; text-align: center; background: var(--card-bg); min-width: 120px; cursor: pointer; transition: transform 0.2s;"
                    onclick="showStudentsByGender('${gId}')"
                    onmouseover="this.style.transform='scale(1.05)'"
                    onmouseout="this.style.transform='scale(1)'">
                    <div style="font-size: 1.5em; font-weight: bold; color: var(--text-primary);">${g.count}</div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">${gId}</div>
                </div>
            `}).join('');
        } else {
            genderContainer.innerHTML = '<p style="width: 100%; text-align: center; color: var(--text-secondary);">No gender data available.</p>';
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

window.updateNavBadge = function(type, count) {
    const navBadge = document.getElementById(`nav-badge-${type}`);
    const sideBadge = document.getElementById(`side-badge-${type}`);
    
    if (navBadge) {
        navBadge.textContent = count;
        navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (sideBadge) {
        sideBadge.textContent = count;
        sideBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
};

let bulkValidStudents = [];
let bulkInvalidStudents = [];

function handleBulkStudentUpload(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    const reader = new FileReader();
    reader.onload = function(e) {
        processCSVData(e.target.result);
        input.value = '';
    };
    reader.readAsText(file);
}

function processCSVData(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        showToast('CSV is empty or missing headers.', 'error');
        return;
    }
    
    // Remove hidden BOM (Byte Order Mark) that Excel often adds, and strip quotes
    const rawHeaderLine = lines[0].replace(/^\uFEFF/, '');
    // const headers = rawHeaderLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
    const rawHeaders = rawHeaderLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
    
    // Map headers to correct casing to prevent ALL CAPS from failing
    const headerMap = {
        'firstname': 'FirstName',
        'lastname': 'LastName',
        'dob': 'DOB',
        'gender': 'Gender',
        'email': 'Email',
        'contact': 'Contact',
        'fathername': 'FatherName',
        "father's name": 'FatherName',
        'city': 'City',
        'pincode': 'Pincode',
        'area': 'Area',
        'aadharnumber': 'AadharNumber',
        'joiningdate': 'JoiningDate',
        'libraryid': 'LibraryID',
        'seatno': 'SeatNo',
        'planduration': 'planDuration',
        'batchtype': 'batchType',
        'currentbatch': 'batchType', // Automatically maps your CurrentBatch column!
        'mustchangepassword': 'mustChangePassword'
    };

    const headers = rawHeaders.map(h => headerMap[h.toLowerCase()] || h);
    bulkValidStudents = [];
    bulkInvalidStudents = [];

    for (let i = 1; i < lines.length; i++) {
        // Regex to split by comma ignoring commas inside double quotes
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        row._originalId = 'row_' + i;
        
        validateBulkRow(row);
    }
    
    document.getElementById('bulkUploadInitial').style.display = 'none';
    document.getElementById('bulkUploadPreview').style.display = 'block';
    switchBulkTab('valid');
}

function validateBulkRow(row) {
    let errors = [];
    if (!row.FirstName || !row.FirstName.trim()) errors.push('Missing First Name');
    
    const contactClean = row.Contact ? row.Contact.replace(/\D/g,'') : '';
    if (!contactClean) errors.push('Missing Contact');
    else if (contactClean.length !== 10) errors.push('Contact must be 10 digits');
    else row.Contact = contactClean;

    if (row.Gender) {
        const g = row.Gender.trim().toLowerCase();
        if (g === 'male') row.Gender = 'Male';
        else if (g === 'female') row.Gender = 'Female';
        else if (g === 'other') row.Gender = 'Other';
        else errors.push(`Invalid Gender (${row.Gender})`);
    }

    if (row.planDuration) {
        const validPlans = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
        const planMatch = validPlans.find(p => p.toLowerCase() === row.planDuration.trim().toLowerCase());
        if (planMatch) row.planDuration = planMatch;
        else errors.push(`Invalid Plan (${row.planDuration})`);
    }

    if (row.batchType) {
        const validBatches = ['Basic', 'Fundamental', 'Standard', "Officer's"];
        const batchMatch = validBatches.find(b => b.toLowerCase() === row.batchType.trim().toLowerCase());
        if (batchMatch) row.batchType = batchMatch;
        else errors.push(`Invalid Batch (${row.batchType})`);
    }
    
    if (errors.length === 0) {
        bulkValidStudents.push(row);
    } else {
        row._errors = errors;
        bulkInvalidStudents.push(row);
    }
}

function switchBulkTab(tab) {
    const validBtn = document.getElementById('bulkTabValidBtn');
    const invalidBtn = document.getElementById('bulkTabInvalidBtn');
    const validContent = document.getElementById('bulkValidContent');
    const invalidContent = document.getElementById('bulkInvalidContent');

    if (tab === 'valid') {
        validBtn.className = 'btn'; validBtn.style.color = ''; validBtn.style.border = '';
        invalidBtn.className = 'btn-outline'; invalidBtn.style.border = 'none'; invalidBtn.style.color = 'var(--text-secondary)';
        validContent.style.display = 'block'; invalidContent.style.display = 'none';
    } else {
        invalidBtn.className = 'btn'; invalidBtn.style.color = ''; invalidBtn.style.border = '';
        validBtn.className = 'btn-outline'; validBtn.style.border = 'none'; validBtn.style.color = 'var(--text-secondary)';
        validContent.style.display = 'none'; invalidContent.style.display = 'block';
    }
    renderBulkLists();
}

function renderBulkLists() {
    document.getElementById('bulkValidCount').textContent = bulkValidStudents.length;
    document.getElementById('bulkSubmitCount').textContent = bulkValidStudents.length;
    document.getElementById('bulkInvalidCount').textContent = bulkInvalidStudents.length;

    const validList = document.getElementById('bulkValidList');
    if (bulkValidStudents.length === 0) {
        validList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No passed students yet.</p>';
    } else {
        validList.innerHTML = bulkValidStudents.map(student => `
            <div style="padding: 10px; border: 1px solid var(--card-border); border-radius: 6px; background: var(--card-bg); margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: var(--primary-color);">${student.FirstName} ${student.LastName || ''}</strong>
                        <div style="font-size: 0.85em; color: var(--text-secondary);"><i class="fa-solid fa-phone"></i> ${student.Contact}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <i class="fa-solid fa-circle-info" onclick="const el = document.getElementById('bulk-valid-info-${student._originalId}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; color: var(--text-secondary); font-size: 1.2em;" title="View all details"></i>
                        <span style="color: var(--success-color); font-weight: 600;"><i class="fa-solid fa-check-circle"></i> Passed</span>
                    </div>
                </div>
                <div id="bulk-valid-info-${student._originalId}" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--card-border); font-size: 0.85em; color: var(--text-secondary);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
                        ${Object.entries(student).filter(([k]) => !['_originalId', '_errors', 'FirstName', 'LastName', 'Contact'].includes(k)).map(([k, v]) => `<div><strong>${k}:</strong> <span style="color: var(--text-primary);">${v || '-'}</span></div>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    const invalidList = document.getElementById('bulkInvalidList');
    if (bulkInvalidStudents.length === 0) {
        invalidList.innerHTML = '<p style="color: var(--success-color); text-align: center; padding: 20px;"><i class="fa-solid fa-check-double"></i> All rows are valid!</p>';
    } else {
        invalidList.innerHTML = bulkInvalidStudents.map(student => `
            <div style="padding: 15px; border: 1px solid var(--error-color); border-left: 4px solid var(--error-color); border-radius: 6px; background: var(--card-bg); margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="color: var(--error-color); font-size: 0.85em; font-weight: 600;">
                        <i class="fa-solid fa-triangle-exclamation"></i> ${student._errors.join(' | ')}
                    </div>
                    <i class="fa-solid fa-circle-info" onclick="const el = document.getElementById('bulk-invalid-info-${student._originalId}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; color: var(--text-secondary); font-size: 1.2em;" title="View all details"></i>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; align-items: end;">
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 0.8em;">First Name *</label>
                        <input type="text" id="fix_fname_${student._originalId}" value="${student.FirstName || ''}" style="padding: 6px;">
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 0.8em;">Contact (10 digits) *</label>
                        <input type="text" id="fix_contact_${student._originalId}" value="${student.Contact || ''}" style="padding: 6px;">
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 0.8em;">Gender</label>
                        <select id="fix_gender_${student._originalId}" style="padding: 6px;">
                            <option value="">None</option>
                            <option value="Male" ${student.Gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${student.Gender === 'Female' ? 'selected' : ''}>Female</option>
                            <option value="Other" ${student.Gender === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 0.8em;">Plan</label>
                        <select id="fix_plan_${student._originalId}" style="padding: 6px;">
                            <option value="">None</option>
                            <option value="Monthly" ${student.planDuration === 'Monthly' ? 'selected' : ''}>Monthly</option>
                            <option value="Quarterly" ${student.planDuration === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
                            <option value="Half-Yearly" ${student.planDuration === 'Half-Yearly' ? 'selected' : ''}>Half-Yearly</option>
                            <option value="Yearly" ${student.planDuration === 'Yearly' ? 'selected' : ''}>Yearly</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 0.8em;">Batch</label>
                        <select id="fix_batch_${student._originalId}" style="padding: 6px;">
                            <option value="">None</option>
                            <option value="Basic" ${student.batchType === 'Basic' ? 'selected' : ''}>Basic</option>
                            <option value="Fundamental" ${student.batchType === 'Fundamental' ? 'selected' : ''}>Fundamental</option>
                            <option value="Standard" ${student.batchType === 'Standard' ? 'selected' : ''}>Standard</option>
                            <option value="Officer's" ${student.batchType === "Officer's" ? 'selected' : ''}>Officer's</option>
                        </select>
                    </div>
                    <button class="btn" style="padding: 7px 12px; font-size: 0.85em; height: 35px;" onclick="fixBulkStudent('${student._originalId}')">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> Push
                    </button>
                </div>
                <div id="bulk-invalid-info-${student._originalId}" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--error-color); font-size: 0.85em; color: var(--text-secondary);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
                        ${Object.entries(student).filter(([k]) => !['_originalId', '_errors', 'FirstName', 'Contact'].includes(k)).map(([k, v]) => `<div><strong>${k}:</strong> <span style="color: var(--text-primary);">${v || '-'}</span></div>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function fixBulkStudent(originalId) {
    const studentIndex = bulkInvalidStudents.findIndex(s => s._originalId === originalId);
    if (studentIndex === -1) return;

    const row = bulkInvalidStudents[studentIndex];
    row.FirstName = document.getElementById(`fix_fname_${originalId}`).value;
    row.Contact = document.getElementById(`fix_contact_${originalId}`).value;
    row.Gender = document.getElementById(`fix_gender_${originalId}`).value || '';
    row.planDuration = document.getElementById(`fix_plan_${originalId}`).value || '';
    row.batchType = document.getElementById(`fix_batch_${originalId}`).value || '';

    bulkInvalidStudents.splice(studentIndex, 1);
    validateBulkRow(row);

    if (bulkValidStudents.find(s => s._originalId === originalId)) {
        showToast('Fixed and moved to Passed list!', 'success');
    } else {
        showToast('Still contains errors', 'warning');
    }
    renderBulkLists();
}

function resetBulkUpload() {
    bulkValidStudents = [];
    bulkInvalidStudents = [];
    document.getElementById('bulkUploadInitial').style.display = 'block';
    document.getElementById('bulkUploadPreview').style.display = 'none';
}

async function submitBulkStudents() {
    if (bulkValidStudents.length === 0) {
        showToast('No valid students to upload.', 'warning');
        return;
    }
    if (!await showConfirm(`Upload ${bulkValidStudents.length} students to the database?`)) return;

    showToast('Uploading and creating accounts... please wait.', 'info');
    try {
        const data = await apiFetch('/admin/students/bulk-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students: bulkValidStudents })
        });
        showToast(data.message, 'success');
        resetBulkUpload();
        window.location.hash = '#students';
        loadStudents();
        loadDashboardStats();
    } catch (error) {
        showToast('Bulk upload failed: ' + error.message, 'error');
    }
}


async function loadStudents() {
    const list = document.getElementById('studentsList');
    list.innerHTML = 'Loading students...';
    try {
        const data = await apiFetch('/admin/students');
        if (data && data.length > 0) {
            currentStudents = data;
            // Initialize filtered list with all students or apply existing search
            filterStudents(true);
        } else {
            list.innerHTML = '<p>No students found.</p>';
            document.getElementById('studentsPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function filterStudents(immediate = false) {
    const searchInput = document.getElementById('studentSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = document.getElementById('filterStudentStatus') ? document.getElementById('filterStudentStatus').value : '';
    const genderFilter = document.getElementById('filterStudentGender') ? document.getElementById('filterStudentGender').value : '';
    const batchFilter = document.getElementById('filterStudentBatch') ? document.getElementById('filterStudentBatch').value : '';
    const planFilter = document.getElementById('filterStudentPlan') ? document.getElementById('filterStudentPlan').value : '';

    if (searchTimeout) clearTimeout(searchTimeout);

    const executeFilter = () => {
        filteredStudents = currentStudents.filter(student => {
            const name = (student.FullName || student.FirstName + ' ' + (student.LastName || '')).toLowerCase();
            const contact = (student.Contact || '').toLowerCase();
            const email = (student.Email || '').toLowerCase();
            const libId = (student.LibraryID || '').toLowerCase();
            const aadhar = (student.AadharNumber || '').toLowerCase();
            
            const matchesQuery = name.includes(query) || contact.includes(query) || email.includes(query) || libId.includes(query) || aadhar.includes(query);
            const matchesStatus = statusFilter === '' || student.AccountStatus === statusFilter;
            const matchesGender = genderFilter === '' || (student.Gender || 'Not Specified') === genderFilter;
            const matchesBatch = batchFilter === '' || student.batchType === batchFilter;
            const matchesPlan = planFilter === '' || student.planDuration === planFilter;

            return matchesQuery && matchesStatus && matchesGender && matchesBatch && matchesPlan;
        });
        currentStudentsPage = 1;
        renderStudents();
    };

    if (immediate) executeFilter();
    else searchTimeout = setTimeout(executeFilter, 300);
}

function showPendingFees() {
    window.location.hash = '#fees';
    const dropdown = document.getElementById('filterFeeStatus');
    if (dropdown) {
        dropdown.value = 'Pending';
        if (currentFees.length > 0) {
            filterFees(true);
        }
    }
}

function showPendingAadhar() {
    window.location.hash = '#aadhar';
    const dropdown = document.getElementById('filterAadharStatus');
    if (dropdown) {
        dropdown.value = 'Pending';
        if (currentAadharStudents && currentAadharStudents.length > 0) {
            filterAadhar(true);
        }
    }
}

function showVerifiedAadhar() {
    window.location.hash = '#aadhar';
    const dropdown = document.getElementById('filterAadharStatus');
    if (dropdown) {
        dropdown.value = 'Verified';
        if (currentAadharStudents && currentAadharStudents.length > 0) {
            filterAadhar(true);
        }
    }
}

function showNotUploadedAadhar() {
    window.location.hash = '#aadhar';
    const dropdown = document.getElementById('filterAadharStatus');
    if (dropdown) {
        dropdown.value = 'Not Uploaded';
        if (currentAadharStudents && currentAadharStudents.length > 0) {
            filterAadhar(true);
        }
    }
}

function showOpenIssues() {
    window.location.hash = '#issues';
    const dropdown = document.getElementById('filterIssueStatus');
    if (dropdown) {
        dropdown.value = 'Open'; // Use a special value
        if (currentIssues.length > 0) {
            filterIssues(true);
        }
    }
}

function showActiveStudents() {
    window.location.hash = '#students';
    const dropdown = document.getElementById('filterStudentStatus');
    const genderDropdown = document.getElementById('filterStudentGender');
    const batchDropdown = document.getElementById('filterStudentBatch');
    const planDropdown = document.getElementById('filterStudentPlan');
    if (dropdown) dropdown.value = 'Active';
    if (genderDropdown) genderDropdown.value = '';
    if (batchDropdown) batchDropdown.value = '';
    if (planDropdown) planDropdown.value = '';
    if (currentStudents.length > 0) {
        filterStudents(true);
    }
}

function showInactiveStudents() {
    window.location.hash = '#students';
    const dropdown = document.getElementById('filterStudentStatus');
    const genderDropdown = document.getElementById('filterStudentGender');
    const batchDropdown = document.getElementById('filterStudentBatch');
    const planDropdown = document.getElementById('filterStudentPlan');
    if (dropdown) dropdown.value = 'Inactive';
    if (genderDropdown) genderDropdown.value = '';
    if (batchDropdown) batchDropdown.value = '';
    if (planDropdown) planDropdown.value = '';
    if (currentStudents.length > 0) {
        filterStudents(true);
    }
}

function showAllStudents() {
    window.location.hash = '#students';
    const dropdown = document.getElementById('filterStudentStatus');
    const genderDropdown = document.getElementById('filterStudentGender');
    const batchDropdown = document.getElementById('filterStudentBatch');
    const planDropdown = document.getElementById('filterStudentPlan');
    if (dropdown) dropdown.value = '';
    if (genderDropdown) genderDropdown.value = '';
    if (batchDropdown) batchDropdown.value = '';
    if (planDropdown) planDropdown.value = '';
    if (currentStudents.length > 0) {
        filterStudents(true);
    }
}

function showPendingApprovals() {
    window.location.hash = '#students';
    const dropdown = document.getElementById('filterStudentStatus');
    const genderDropdown = document.getElementById('filterStudentGender');
    const batchDropdown = document.getElementById('filterStudentBatch');
    const planDropdown = document.getElementById('filterStudentPlan');
    if (dropdown) dropdown.value = 'Pending';
    if (genderDropdown) genderDropdown.value = '';
    if (batchDropdown) batchDropdown.value = '';
    if (planDropdown) planDropdown.value = '';
    if (currentStudents.length > 0) {
        filterStudents(true);
    }
}

function showStudentsByGender(gender) {
    window.location.hash = '#students';
    const statusDropdown = document.getElementById('filterStudentStatus');
    const genderDropdown = document.getElementById('filterStudentGender');
    const batchDropdown = document.getElementById('filterStudentBatch');
    const planDropdown = document.getElementById('filterStudentPlan');
    
    if (statusDropdown) statusDropdown.value = 'Active'; // Stats only count active students
    if (genderDropdown) genderDropdown.value = gender;
    if (batchDropdown) batchDropdown.value = '';
    if (planDropdown) planDropdown.value = '';
    
    if (currentStudents.length > 0) {
        filterStudents(true);
    }
}

function showStudentsByBatchPlan(batch, plan) {
    window.location.hash = '#students';
    const statusDropdown = document.getElementById('filterStudentStatus');
    const genderDropdown = document.getElementById('filterStudentGender');
    const batchDropdown = document.getElementById('filterStudentBatch');
    const planDropdown = document.getElementById('filterStudentPlan');
    
    if (statusDropdown) statusDropdown.value = 'Active'; // Stats only count active students
    if (genderDropdown) genderDropdown.value = '';
    if (batchDropdown) batchDropdown.value = batch;
    if (planDropdown) planDropdown.value = plan;
    
    if (currentStudents.length > 0) {
        filterStudents(true);
    }
}

function renderStudents() {
    const list = document.getElementById('studentsList');
    const startIndex = (currentStudentsPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  list.innerHTML = paginatedStudents.map(student => `
        <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; flex-wrap: wrap; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${student.ProfilePictureURL || '/img/default-avatar.png'}" alt="Profile" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--card-border); ${student.ProfilePictureURL ? 'cursor: pointer;' : ''}" ${student.ProfilePictureURL ? `onclick="window.open('${student.ProfilePictureURL}', '_blank')"` : ''} title="View Profile Picture">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">

                            <strong style="font-size:1.15em; color:var(--primary-color); line-height:1.2;">
                            ${student.FullName || student.FirstName + ' ' + (student.LastName || '')}
                            </strong>

                          
                                <span style="font-size:1em; color:var(--secondary-color); ">
                                    <i class="fa-solid fa-cake-candles"></i>   
                                    ${student.DOB 
                                    ? new Date(student.DOB)
                                    .toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })
                                    .replace(/ /g,'-')
                                    : 'N/A'}
                                </span>
                            

                        </div>
                        <strong><span style="font-size:0.85em; color:var(--secondary-color); font-size:1em"">ID: ${student.LibraryID || 'Not Assigned'}</span></strong>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select onchange="updateStudentStatus('${student._id}', this.value)" style="padding: 5px; border-radius: 6px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); font-size: 0.85em; font-weight: 500; cursor: pointer; width: auto;">
                        <option value="Pending" ${student.AccountStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Active" ${student.AccountStatus === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${student.AccountStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>

                    <button onclick="viewNotificationHistory('${student._id}')" class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--text-secondary); color: var(--text-secondary); border-radius: 6px; font-size: 0.85em;" title="Notification History"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button onclick="openNotifyModal('${student._id}')" class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--primary-color); color: var(--primary-color); border-radius: 6px; font-size: 0.85em;" title="Send Notification"><i class="fa-regular fa-bell"></i></button>
                    <button onclick="viewStudent('${student._id}')" class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--primary-color); color: var(--primary-color); border-radius: 6px; font-size: 0.85em;"><i class="fa-solid fa-pen-to-square"></i> </button>
                    <button onclick="resetStudentPassword('${student._id}')" class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--warning-color); color: var(--warning-color); border-radius: 6px; font-size: 0.85em;" title="Reset Password"><i class="fa-solid fa-key"></i></button>
                </div>
            </div>
            <div style="font-size: 0.95em; color: var(--text-secondary); display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; padding-top: 12px; border-top: 1px solid var(--card-border);">
                <div>
                <i class="fa-solid fa-phone" style="width:16px; color:var(--text-muted);"></i>
                ${student.Contact || 'N/A'}

                ${student.Contact ? `
                <i class="fa-brands fa-whatsapp"
                style="font-size:1.2em; margin-left:8px; color:#25D366; cursor:pointer;"
                onclick="sendWhatsApp('${student._id}')"
                title="Send WhatsApp Message">
                </i>

                <!--
                <i class="fa-solid fa-message"
                style="margin-left:8px; color:#0ea5e9; cursor:pointer;"
                onclick="sendSMS('${student._id}')"
                title="Send SMS">
                </i> 
                 -->

                ` : ''}

                </div>
                <div style="display: flex; align-items: center; gap: 5px; min-width: 0;">
                    <i class="fa-solid fa-envelope" style="width: 16px; color: var(--text-muted); flex-shrink: 0;"></i> 
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${student.Email || 'N/A'}">${student.Email || 'N/A'}</span>
                    ${student.Email ? (student.isEmailVerified ? '<i class="fa-solid fa-circle-check" style="color: var(--success-color); flex-shrink: 0;" title="Email Verified"></i>' : `<i class="fa-solid fa-circle-exclamation" style="color: var(--warning-color); flex-shrink: 0;" title="Email Not Verified"></i><button onclick="event.stopPropagation(); sendEmailReminder('${student._id}')" class="btn-outline" style="padding: 2px 6px; font-size: 0.8em; margin-left: 5px; border-radius: 4px;" title="Send Reminder"><i class="fa-regular fa-bell" style="font-size:1.5em;  color: var(--warning-color);"></i> </button>`) : ''}
                </div>

                <div><i class="fa-solid fa-layer-group" style="width: 16px; color: var(--text-muted);"></i> ${student.planDuration || 'N/A'} (${student.batchType || 'N/A'} - <i class="fa-solid fa-chair" style="width: 16px; color: var(--text-muted);"></i> ${student.SeatNo || 'N/A'})</div>
                
                <!--<div><i class="fa-solid fa-clock" style="width: 16px; color: var(--text-muted);"></i> ${student.batchTiming || 'N/A'}</div> -->

            </div>
        </div>
    `).join('');


    renderStudentsPagination();
}

function sendWhatsApp(studentId){

    const student = currentStudents.find(s => s._id === studentId);
    if (!student) return;

    const name = student.FirstName ;
    const libraryId = student.LibraryID || 'N/A';
    const batchTiming = student.batchTiming || 'N/A';
    const planDuration = student.planDuration || 'N/A';
    const batchType = student.batchType || 'N/A';
    const seatNo = student.SeatNo || 'N/A';
    const joiningDate = new Date(student.JoiningDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
    });


   
    const msg = `Hello ${name},

    Welcome to *Knowledge Nook Library*!

    Your seat has been successfully confirmed. Here are your details:

    Library ID: ${libraryId}
    Seat No: ${seatNo}
    Batch Type: ${batchType}
    Timing: ${batchTiming}
    Plan: ${planDuration}
    Joining Date: ${joiningDate}

    Please follow the library rules and maintain a peaceful study environment.

    If you need any assistance, feel free to contact us.

    Happy Studying!
    — Knowledge Nook Library`;

    const url = `https://wa.me/91${student.Contact}?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
}

// Personal SMS Confirmation

// function sendSMS(studentId){

// const student = currentStudents.find(s => s._id === studentId);
// if(!student) return;

//     const name = student.FullName || (student.FirstName + ' ' + (student.LastName || ''));
//     const libraryId = student.LibraryID || 'N/A';
//     const batchTiming = student.batchTiming || 'N/A';
//     const planDuration = student.planDuration || 'N/A';
//     const batchType = student.batchType || 'N/A';
//     const seatNo = student.SeatNo || 'N/A';
//     const joiningDate = new Date(student.JoiningDate).toLocaleDateString('en-GB', {
//         day: '2-digit',
//         month: 'long',
//         year: 'numeric',
//         timeZone: 'Asia/Kolkata'
//     });

//     const msg = `Hello ${name},

//     Welcome to Knowledge Nook Library!

//     Your seat has been successfully confirmed. Here are your details:

//     Library ID: ${libraryId}
//     Seat No: ${seatNo}
//     Batch Type: ${batchType}
//     Timing: ${batchTiming}
//     Plan: ${planDuration}
//     Joining Date: ${joiningDate}

//     Please follow the library rules and maintain a peaceful study environment.

//     If you need any assistance, feel free to contact us.

//     Happy Studying!
//     — Knowledge Nook Library`;

// const url = `sms:${student.Contact}?body=${encodeURIComponent(msg)}`;

// window.open(url);
// }


function renderStudentsPagination() {
    const pagination = document.getElementById('studentsPagination');
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentStudentsPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeStudentsPage(${currentStudentsPage - 1})"`}>Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${currentStudentsPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeStudentsPage(${i})">${i}</button>`;
    }

    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentStudentsPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeStudentsPage(${currentStudentsPage + 1})"`}>Next</button>`;

    pagination.innerHTML = html;
}

function changeStudentsPage(page) {
    if (page < 1 || page > Math.ceil(filteredStudents.length / studentsPerPage)) return;
    currentStudentsPage = page;
    renderStudents();
}

function performGlobalSearch() {
    const query = document.getElementById('globalStudentSearch').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('globalSearchResults');

    if (!query) {
        resultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Enter search criteria above to find a student.</p>';
        return;
    }

    const matches = currentStudents.filter(s => {
        return (s.LibraryID && s.LibraryID.toLowerCase().includes(query)) ||
               (s.Contact && s.Contact.toLowerCase().includes(query)) ||
               (s.Email && s.Email.toLowerCase().includes(query)) ||
               (s.AadharNumber && s.AadharNumber.toLowerCase().includes(query)) ||
               ((s.FullName || s.FirstName + ' ' + (s.LastName || '')).toLowerCase().includes(query));
    });

    if (matches.length === 0) {
        resultsContainer.innerHTML = '<p style="color: var(--error-color); text-align: center; padding: 20px;">No student found matching this criteria.</p>';
        return;
    }

    resultsContainer.innerHTML = matches.map(student => `
        <div onclick="viewStudent('${student._id}', true)" style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${student.ProfilePictureURL || '/img/default-avatar.png'}" alt="Profile" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--card-border);">
                    <div>
                        <strong style="font-size: 1.15em; color: var(--primary-color);">${student.FullName || student.FirstName + ' ' + (student.LastName || '')}</strong>
                        <div style="font-size: 0.9em; color: var(--text-secondary);">ID: ${student.LibraryID || 'N/A'}</div>
                    </div>
                </div>
                <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${student.AccountStatus === 'Active' ? 'var(--success-color)' : (student.AccountStatus === 'Pending' ? 'var(--warning-color)' : 'var(--error-color)')}; font-weight: 600;">
                    ${student.AccountStatus}
                </span>
            </div>
            <div style="font-size: 0.95em; color: var(--text-secondary); display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding-top: 10px; border-top: 1px solid var(--card-border);">
                <div><i class="fa-solid fa-phone" style="width: 16px;"></i> ${student.Contact || 'N/A'}</div>
                <div style="display: flex; align-items: center; gap: 5px; min-width: 0;">
                    <i class="fa-solid fa-envelope" style="width: 16px; flex-shrink: 0;"></i> 
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${student.Email || 'N/A'}">${student.Email || 'N/A'}</span>
                    ${student.Email ? (student.isEmailVerified ? '<i class="fa-solid fa-circle-check" style="color: var(--success-color); flex-shrink: 0;" title="Email Verified"></i>' : '<i class="fa-solid fa-circle-exclamation" style="color: var(--warning-color); flex-shrink: 0;" title="Email Not Verified"></i>') : ''}
                    ${student.Email ? (student.isEmailVerified ? '<i class="fa-solid fa-circle-check" style="color: var(--success-color); flex-shrink: 0;" title="Email Verified"></i>' : `<i class="fa-solid fa-circle-exclamation" style="color: var(--warning-color); flex-shrink: 0;" title="Email Not Verified"></i><button onclick="event.stopPropagation(); sendEmailReminder('${student._id}')" class="btn-outline" style="padding: 2px 6px; font-size: 0.8em; margin-left: 5px; border-radius: 4px;" title="Send Reminder"><i class="fa-regular fa-bell"></i></button>`) : ''}
                </div>
                <div><i class="fa-solid fa-chair" style="width: 16px;"></i> Seat: ${student.SeatNo || 'N/A'}</div>
                <div><i class="fa-solid fa-clock" style="width: 16px;"></i> ${student.batchTiming || 'N/A'}</div>
            </div>
        </div>
    `).join('');
}
// Interested Students Paginations Logic
let currentInterested = [];
let interestedPage = 1;
const interestedPerPage = 10;

async function loadInterestedStudents() {
    const list = document.getElementById('interestedList');
    list.innerHTML = 'Loading interested students...';
    try {
        const data = await apiFetch('/admin/interested-students');
        if (data && data.length > 0) {
            currentInterested = data;
            interestedPage = 1;
            renderInterestedStudents();
        } else {
            list.innerHTML = '<p>No interested students found.</p>';
            if (document.getElementById('interestedPagination')) document.getElementById('interestedPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderInterestedStudents() {
    const list = document.getElementById('interestedList');
    const startIndex = (interestedPage - 1) * interestedPerPage;
    const endIndex = startIndex + interestedPerPage;
    const paginatedData = currentInterested.slice(startIndex, endIndex);

    list.innerHTML = paginatedData.map(student => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--card-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <strong style="font-size: 1.1em;">${student.Name}</strong>
                            <span style="font-size: 0.85em; margin-left: 10px; padding: 3px 8px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${student.Status === 'Reviewed' ? 'var(--success-color)' : 'var(--warning-color)'}; font-weight: 600;">${student.Status}</span>
                        </div>
                        <div style="font-size: 0.85em; color: var(--text-light);">
                            ${new Date(student.SubmittedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')}
                        </div>
                    </div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">
                        <i class="fa-solid fa-phone"></i> ${student.Contact} | <i class="fa-solid fa-clock"></i> Plan: ${student.planDuration} (${student.batchType} - ₹${student.amount})
                    </div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">
                        <i class="fa-solid fa-map-marker-alt"></i> ${student.Address}
                    </div>
                    ${student.Remarks ? `<div style="font-size: 0.9em; background: var(--input-bg); padding: 8px; border-radius: 4px; margin-bottom: 10px;"><em>"${student.Remarks}"</em></div>` : ''}
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        ${student.Status === 'Pending' ? `<button onclick="reviewInterestedStudent('${student._id}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85em; background: var(--success-color);">Mark Reviewed</button>` : ''}
                        ${student.Status === 'Reviewed' ? `<button onclick="promptConvertStudent('${student._id}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85em;">Create Account</button>` : ''}
                        <button onclick="rejectInterestedStudent('${student._id}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85em; background: var(--error-color);">Reject</button>
                    </div>
                </div>
            `).join('');

    renderInterestedPagination();
}

function renderInterestedPagination() {
    const pagination = document.getElementById('interestedPagination');
    if (!pagination) return;
    const totalPages = Math.ceil(currentInterested.length / interestedPerPage);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${interestedPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeInterestedPage(${interestedPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${interestedPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeInterestedPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${interestedPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeInterestedPage(${interestedPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

window.changeInterestedPage = function(page) {
    if (page < 1 || page > Math.ceil(currentInterested.length / interestedPerPage)) return;
    interestedPage = page;
    renderInterestedStudents();
}

async function reviewInterestedStudent(id) {
    if (!await showConfirm('Mark this student as reviewed?')) return;
    try {
        await apiFetch(`/admin/interested-students/${id}/review`, { method: 'PUT' });
        showToast('Student marked as reviewed successfully', 'success');
        loadInterestedStudents();
        loadDashboardStats();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function rejectInterestedStudent(id) {
    const reason = await showPrompt('Please enter a reason for rejection:');
    if (reason === null) return; // User cancelled

    try {
        await apiFetch(`/admin/interested-students/${id}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Reason: reason || 'Not specified' })
        });
        showToast('Application rejected', 'success');
        loadInterestedStudents();
        loadDashboardStats();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function promptConvertStudent(id) {
    document.getElementById('convertStudentId').value = id;
    document.getElementById('convertDate').valueAsDate = new Date();
    document.getElementById('convertMsg').textContent = '';
    document.getElementById('convertStudentModal').style.display = 'block';
}

function closeConvertModal() {
    document.getElementById('convertStudentModal').style.display = 'none';
}

async function submitConvertStudent(e) {
    e.preventDefault();
    const id = document.getElementById('convertStudentId').value;
    const msg = document.getElementById('convertMsg');

    const payload = {
        LibraryID: document.getElementById('convertLibraryID').value,
        Email: document.getElementById('convertEmail').value || undefined,
        SeatNo: document.getElementById('convertSeatNo').value,
        planDuration: document.getElementById('convertPlanDuration').value,
        batchType: document.getElementById('convertBatchType').value,
        batchTiming: document.getElementById('convertBatchTiming').value,
        amount: document.getElementById('convertAmount').value,
        JoiningDate: document.getElementById('convertDate').value
    };

    try {
        msg.style.color = 'var(--text-secondary)';
        msg.textContent = 'Creating account...';

        const data = await apiFetch(`/admin/convert-student/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        msg.style.color = 'var(--success-color)';
        msg.textContent = `Success! Default Password: ${data.defaultPassword}`;

        setTimeout(() => {
            closeConvertModal();
            loadInterestedStudents();
            loadDashboardStats();
        }, 3000);

    } catch (error) {
        msg.style.color = 'var(--error-color)';
        msg.textContent = error.message;
    }
}

async function updateStudentStatus(id, status) {
    if (!await showConfirm(`Are you sure you want to change this student's status to "${status}"?`)) {
        // Re-render to revert the dropdown if user cancels.
        renderStudents();
        return;
    }
    try {
        await apiFetch('/admin/students/' + id, {
            method: 'PUT',
            body: JSON.stringify({ AccountStatus: status })
        });
        // Update local data to prevent it from reverting on next filter/sort.
        const student = currentStudents.find(s => s._id === id);
        if (student) student.AccountStatus = status;
        loadDashboardStats();
    } catch (error) {
        showToast('Error updating status: ' + error.message, 'error');
        renderStudents(); // Re-render on error to show correct state
    }
}

async function approveStudent(id) {
    if (!await showConfirm('Are you sure you want to approve this student account?')) return;
    try {
        await apiFetch('/admin/students/' + id, {
            method: 'PUT',
            body: JSON.stringify({ AccountStatus: 'Active' })
        });
        loadStudents();
        loadDashboardStats();
    } catch (error) {
        showToast('Error approving student: ' + error.message, 'error');
    }
}

async function verifyAadhar(id, status) {
    if (!await showConfirm('Mark Aadhar as Verified?')) return;
    try {
        await apiFetch(`/admin/students/${id}/verify-aadhar`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Verified' })
        });
        if (window.location.hash === '#aadhar') {
            loadAadhar();
        } else {
            loadStudents();
        }
        loadDashboardStats();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function rejectAadhar(id) {
    const reason = await showPrompt("Please enter the reason for rejecting the Aadhar proof:");
    if (reason === null) return;

    try {
        await apiFetch(`/admin/students/${id}/verify-aadhar`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Rejected', reason: reason || 'Invalid Document' })
        });
        if (window.location.hash === '#aadhar') {
            loadAadhar();
        } else {
            loadStudents();
        }
        loadDashboardStats();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function viewStudent(id, isReadOnly = false) {
    const student = currentStudents.find(s => s._id === id);
    if (!student) return;

    const modal = document.getElementById('studentModal');
    const content = document.getElementById('studentModalContent');

    content.innerHTML = `
        <div style="grid-column: 1 / -1; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid var(--card-border);">
            <h3 style="margin: 0; color: var(--primary-color); font-size: 1.1em;"><i class="fa-solid fa-book-open-reader"></i> Library & Account Details</h3>
        </div>
        <div class="form-group">
            <label>Library ID</label>
            <input type="text" id="modalLibraryID" value="${student.LibraryID || ''}">
        </div>
        <div class="form-group">
            <label>Account Status</label>
            <select id="modalStatus">
                <option value="Pending" ${student.AccountStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Active" ${student.AccountStatus === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${student.AccountStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
        </div>
        <div class="form-group">
            <label>Seat Number</label>
            <input type="text" id="modalSeatNo" value="${student.SeatNo || ''}" placeholder="E.g., S-101">
        </div>
        <div class="form-group">
            <label>Plan Duration</label>
            <select id="modalPlanDuration" onchange="calculateModalFee()">
                <option value="Monthly" ${student.planDuration === 'Monthly' ? 'selected' : ''}>Monthly</option>
                <option value="Quarterly" ${student.planDuration === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
                <option value="Half-Yearly" ${student.planDuration === 'Half-Yearly' ? 'selected' : ''}>Half-Yearly</option>
                <option value="Yearly" ${student.planDuration === 'Yearly' ? 'selected' : ''}>Yearly</option>
            </select>
        </div>
        <div class="form-group">
            <label>Batch Type</label>
            <select id="modalBatchType" onchange="calculateModalFee()">
                <option value="Basic" ${student.batchType === 'Basic' ? 'selected' : ''}>Basic</option>
                <option value="Fundamental" ${student.batchType === 'Fundamental' ? 'selected' : ''}>Fundamental</option>
                <option value="Standard" ${student.batchType === 'Standard' ? 'selected' : ''}>Standard</option>
                <option value="Officer's" ${student.batchType === "Officer's" ? 'selected' : ''}>Officer's</option>
            </select>
        </div>
        <div class="form-group">
            <label>Batch Timing</label>
            <input type="text" id="modalBatchTiming" value="${student.batchTiming || ''}" placeholder="E.g. 9 AM - 6 PM">
        </div>
        <div class="form-group">
            <label>Calculated Amount (₹)</label>
            <input type="number" id="modalAmount" value="${student.amount || ''}" placeholder="E.g., 1000">
        </div>

        <div style="grid-column: 1 / -1; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid var(--card-border);">
            <h3 style="margin: 0; color: var(--primary-color); font-size: 1.1em;"><i class="fa-solid fa-user"></i> Personal Details</h3>
        </div>
        <div class="form-group">
            <label>First Name</label>
            <input type="text" id="modalFirstName" value="${student.FirstName || ''}" required>
        </div>
        <div class="form-group">
            <label>Last Name</label>
            <input type="text" id="modalLastName" value="${student.LastName || ''}">
        </div>
        <div class="form-group">
            <label>DOB (YYYY-MM-DD)</label>
            <input type="date" id="modalDOB" value="${student.DOB ? new Date(student.DOB).toISOString().split('T')[0] : ''}">
        </div>
        <div class="form-group">
            <label>Gender</label>
            <select id="modalGender">
                <option value="Male" ${student.Gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${student.Gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${student.Gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
        </div>
        <div class="form-group">
            <label>Father's Name</label>
            <input type="text" id="modalFatherName" value="${student.FatherName || ''}">
        </div>
        <div class="form-group">
            <label>Aadhar Number</label>
            <input type="text" id="modalAadhar" value="${student.AadharNumber || ''}">
        </div>

        <div style="grid-column: 1 / -1; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid var(--card-border);">
            <h3 style="margin: 0; color: var(--primary-color); font-size: 1.1em;"><i class="fa-solid fa-address-book"></i> Contact Information</h3>
        </div>
        <div class="form-group">
            <label style="display: flex; justify-content: space-between; align-items: center;">
                Email
                ${student.Email ? (student.isEmailVerified ? '<span style="color: var(--success-color); font-size: 0.85em;"><i class="fa-solid fa-circle-check"></i> Verified</span>' : '<span style="color: var(--warning-color); font-size: 0.85em;"><i class="fa-solid fa-circle-exclamation"></i> Not Verified</span>') : ''}
            </label>
            <input type="email" id="modalEmail" value="${student.Email || ''}">
        </div>
        <div class="form-group">
            <label>Contact</label>
            <input type="text" id="modalContact" value="${student.Contact || ''}" required>
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
            <label>City</label>
            <input type="text" id="modalCity" value="${student.City || ''}">
        </div>
        <div class="form-group">
            <label>Area</label>
            <input type="text" id="modalArea" value="${student.Area || ''}">
        </div>
        <div class="form-group">
            <label>Pincode</label>
            <input type="text" id="modalPincode" value="${student.Pincode || ''}">
        </div>
    `;

    const modalTitle = document.querySelector('#studentModal h2');
    const submitBtn = document.querySelector('#updateStudentForm button[type="submit"]');

    if (isReadOnly) {
        modalTitle.textContent = 'Student Profile (View Only)';
        if (submitBtn) submitBtn.style.display = 'none';
        
        const formElements = content.querySelectorAll('input, select');
        formElements.forEach(el => {
            el.disabled = true;
            el.style.backgroundColor = 'var(--bg-color)';
            el.style.cursor = 'not-allowed';
        });
    } else {
        modalTitle.textContent = 'Edit Student Profile';
        if (submitBtn) submitBtn.style.display = 'inline-block';
    }

    document.getElementById('modalStudentId').value = student._id;
    modal.style.display = 'block';
}

async function resetStudentPassword(id) {
    if (!await showConfirm('Are you sure you want to reset this student\'s password to the default ("library@123")?')) return;
    
    try {
        await apiFetch('/admin/students/' + id, {
            method: 'PUT',
            body: JSON.stringify({ ResetPassword: true })
        });
        showToast('Password reset to "library@123" successfully.', 'success');
    } catch(e) {
        showToast('Error resetting password: ' + e.message, 'error');
    }
}

function closeStudentModal() {
    document.getElementById('studentModal').style.display = 'none';
}

// --- Manual Notification Logic ---
function openNotifyModal(id) {
    document.getElementById('notifyStudentId').value = id;
    document.getElementById('notifyForm').reset();
    document.getElementById('customMessageContainer').style.display = 'none';
    document.getElementById('notifyStudentModal').style.display = 'block';
}

function closeNotifyModal() {
    document.getElementById('notifyStudentModal').style.display = 'none';
}

window.sendEmailReminder = async function(id) {
    if (!await showConfirm('Send an email verification reminder push notification to this student?')) return;
    try {
        const response = await apiFetch('/admin/students/' + id + '/notify', {
            method: 'POST',
            body: JSON.stringify({ type: 'email_reminder' })
        });
        showToast(response.message || 'Reminder sent!', 'success');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function toggleCustomMessageField() {
    const type = document.getElementById('notifyType').value;
    const container = document.getElementById('customMessageContainer');
    const customInput = document.getElementById('notifyCustomMessage');
    if (type === 'custom') {
        container.style.display = 'block';
        customInput.required = true;
    } else {
        container.style.display = 'none';
        customInput.required = false;
    }
}

async function submitManualNotification(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    try {
        const payload = {
            type: document.getElementById('notifyType').value,
            customMessage: document.getElementById('notifyCustomMessage').value
        };
        const response = await apiFetch(`/admin/students/${document.getElementById('notifyStudentId').value}/notify`, {
            method: 'POST', body: JSON.stringify(payload)
        });
        showToast(response.message, 'success');
        closeNotifyModal();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function viewNotificationHistory(id) {
    document.getElementById('notificationHistoryModal').style.display = 'block';
    const list = document.getElementById('notificationHistoryList');
    list.innerHTML = 'Loading history...';
    
    try {
        const data = await apiFetch(`/admin/students/${id}/notifications`);
        if (data && data.length > 0) {
            list.innerHTML = data.map(n => `
                <div style="padding: 15px; border: 1px solid var(--card-border); margin-bottom: 10px; border-radius: 8px; background: var(--bg-color); border-left: 4px solid var(--primary-color);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <strong style="color: var(--primary-color); font-size: 1.05em;">${n.Title}</strong>
                        <span style="font-size: 0.85em; color: var(--text-secondary);">${new Date(n.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <div style="font-size: 0.95em; color: var(--text-primary); margin-bottom: 8px;">${n.Message}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.85em; color: ${n.IsRead ? 'var(--success-color)' : 'var(--warning-color)'}; font-weight: 600;">
                            <i class="fa-solid ${n.IsRead ? 'fa-check-double' : 'fa-check'}"></i> ${n.IsRead ? 'Read by Student' : 'Delivered (Unread)'}
                        </div>
                        ${n.HiddenByStudent ? `<span style="font-size: 0.85em; color: var(--error-color); font-weight: 600;" title="Student deleted this message from their dashboard"><i class="fa-solid fa-trash-can"></i> Deleted by Student</span>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No notifications sent to this student yet.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function closeNotificationHistoryModal() {
    document.getElementById('notificationHistoryModal').style.display = 'none';
}

function calculateModalFee() {
    const duration = document.getElementById('modalPlanDuration').value;
    const batch = document.getElementById('modalBatchType').value;
    const amountField = document.getElementById('modalAmount');
    
    if (duration && batch && pricingGrid[duration] && pricingGrid[duration][batch]) {
        amountField.value = pricingGrid[duration][batch];
    } else {
        amountField.value = '';
    }
}

async function submitStudentUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    try {
        const id = document.getElementById('modalStudentId').value;
        const payload = {
            LibraryID: document.getElementById('modalLibraryID').value || undefined,
            FirstName: document.getElementById('modalFirstName').value,
            LastName: document.getElementById('modalLastName').value,
            Email: document.getElementById('modalEmail').value || undefined,
            Contact: document.getElementById('modalContact').value,
            DOB: document.getElementById('modalDOB').value || undefined,
            Gender: document.getElementById('modalGender').value,
            AadharNumber: document.getElementById('modalAadhar').value,
            FatherName: document.getElementById('modalFatherName').value,
            City: document.getElementById('modalCity').value,
            Area: document.getElementById('modalArea').value,
            Pincode: document.getElementById('modalPincode').value,
            AccountStatus: document.getElementById('modalStatus').value,
            SeatNo: document.getElementById('modalSeatNo').value,
            planDuration: document.getElementById('modalPlanDuration').value,
            batchType: document.getElementById('modalBatchType').value,
            batchTiming: document.getElementById('modalBatchTiming').value,
            amount: document.getElementById('modalAmount').value
        };

        await apiFetch('/admin/students/' + id, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        showToast('Student profile updated successfully!', 'success');
        closeStudentModal();
        loadStudents(); // Refresh the list
    } catch (error) {
        showToast('Error updating student: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadFees() {
    const list = document.getElementById('feesList');
    list.innerHTML = 'Loading fees...';
    try {
        const data = await apiFetch('/fees');
        if (data && data.length > 0) {
            currentFees = data;
            filterFees(true);
        } else {
            list.innerHTML = '<p>No fee records found.</p>';
            document.getElementById('feesPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function filterFees(immediate = false) {
    const searchInput = document.getElementById('feeSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = document.getElementById('filterFeeStatus') ? document.getElementById('filterFeeStatus').value : '';

    if (searchTimeout) clearTimeout(searchTimeout);

    const executeFilter = () => {
        filteredFees = currentFees.filter(fee => {
            const studentName = fee.StudentId ? (fee.StudentId.FullName || '').toLowerCase() : '';
            const libId = fee.StudentId ? (fee.StudentId.LibraryID || '').toLowerCase() : '';
            const month = (fee.Month || '').toLowerCase();
            const feeStatus = (fee.Status || '');
            const batch = (fee.Batch || (fee.StudentId?.batchType || '')).toLowerCase();
            const amount = String(fee.Amount || '');
            
            const matchesQuery = studentName.includes(query) || libId.includes(query) || month.includes(query) || feeStatus.toLowerCase().includes(query) || batch.includes(query) || amount.includes(query);
            const matchesStatus = statusFilter === '' || feeStatus === statusFilter;

            return matchesQuery && matchesStatus;
        });
        currentFeesPage = 1;
        renderFees();
    };

    if (immediate) executeFilter();
    else searchTimeout = setTimeout(executeFilter, 300);
}

function renderFees() {
    const list = document.getElementById('feesList');
    const startIndex = (currentFeesPage - 1) * feesPerPage;
    const endIndex = startIndex + feesPerPage;
    const paginatedFees = filteredFees.slice(startIndex, endIndex);

    list.innerHTML = paginatedFees.map(fee => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${fee.StudentId ? `${fee.StudentId.FullName} (ID: ${fee.StudentId.LibraryID || 'N/A'})` : 'Unknown Student'}</strong>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${fee.isResubmitted && fee.Status === 'Pending' ? `<span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: var(--primary-light); color: var(--primary-color); font-weight: 600;"><i class="fa-solid fa-rotate-right"></i> Resubmitted</span>` : ''}
                            <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${fee.Status === 'Approved' || fee.Status === 'Paid' ? 'var(--success-color)' : (fee.Status === 'Pending' ? 'var(--warning-color)' : 'var(--error-color)')}; font-weight: 600;">
                                ${fee.Status}
                            </span>
                        </div>
                    </div>
                    <div style="font-size: 0.95em; color: var(--text-secondary); display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 15px; padding-top: 10px; border-top: 1px solid var(--card-border);">
                        <div><strong>Month:</strong> ${(fee.Month || 'N/A').charAt(0).toUpperCase() + (fee.Month || '').slice(1)}</div>
                        <div><strong>Batch:</strong> ${
                            fee.Batch || 
                            (fee.StudentId 
                                ? `${fee.StudentId.planDuration || 'N/A'} (${fee.StudentId.batchType || 'N/A'})`
                                : 'N/A'
                            )
                        }</div>
                        <div><strong>Amount:</strong> ₹${fee.Amount || 0}</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        ${fee.ProofImageURL ? `
                            <a href="${fee.ProofImageURL}" target="_blank" style="font-size: 0.85em; color: var(--primary-color); margin-right: 15px;">
                                <i class="fa-solid fa-image"></i> View Receipt Image
                            </a>
                            ${fee.Status !== 'Pending' ? `
                                <button onclick="deleteReceiptImage('${fee._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: var(--error-color); color: var(--error-color); border-radius: 4px; font-size: 0.85em;" title="Delete Receipt">
                                    <i class="fa-solid fa-trash"></i> Delete Receipt
                                </button>
                            ` : ''}
                        ` : `
                            <span style="font-size: 0.85em; color: var(--text-secondary);">
                                <i class="fa-solid fa-image-slash"></i> Receipt Image Deleted
                            </span>
                        `}
                    </div>

                        ${fee.Status === 'Rejected' && fee.AdminNote ? `
                        <div style="margin-top:8px; margin-bottom:10px;">
                            <span onclick="const el = document.getElementById('reject-details-${fee._id}'); el.style.display = el.style.display === 'none' ? 'inline-block' : 'none';" style="cursor: pointer; font-size: 0.85em; color: var(--error-color); display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                                <i class="fa-solid fa-circle-info"></i> Rejection Reason
                            </span>
                            <div id="reject-details-${fee._id}" style="display: none; margin-top: 5px; padding:6px 12px; background: var(--bg-color); border: 1px dashed var(--error-color); border-radius:8px; font-size:0.85em; color:var(--error-color);">
                                ${fee.AdminNote}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${fee.Status === 'Paid' && fee.AdminNote ? `
                        <div style="margin-top:8px; margin-bottom:10px;">
                            <span onclick="const el = document.getElementById('details-${fee._id}'); el.style.display = el.style.display === 'none' ? 'inline-block' : 'none';" style="cursor: pointer; font-size: 0.85em; color: var(--success-color); display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                                <i class="fa-solid fa-circle-info"></i> Payment Details
                            </span>
                            <div id="details-${fee._id}" style="display: none; margin-top: 5px; padding:6px 12px; background: var(--bg-color); border: 1px dashed var(--success-color); border-radius:8px; font-size:0.85em; color:var(--success-color);">
                                ${fee.AdminNote}
                            </div>
                        </div>
                        ` : ''}




                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label for="feeStatus-${fee._id}" style="font-size: 0.85em; font-weight: 600;">Status:</label>
                        <select id="feeStatus-${fee._id}" onchange="updateFeeStatus('${fee._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); cursor: pointer; width: auto;" ${fee.Status === 'Paid' || fee.Status === 'Rejected' ? 'disabled' : ''}>
                            <option value="Pending" ${fee.Status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Paid" ${fee.Status === 'Paid' ? 'selected' : ''}>Paid</option>
                            <option value="Rejected" ${fee.Status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                </div>
            `).join('');

    renderFeesPagination();
}

function renderFeesPagination() {
    const pagination = document.getElementById('feesPagination');
    const totalPages = Math.ceil(filteredFees.length / feesPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentFeesPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeFeesPage(${currentFeesPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${currentFeesPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeFeesPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentFeesPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeFeesPage(${currentFeesPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

function changeFeesPage(page) {
    if (page < 1 || page > Math.ceil(filteredFees.length / feesPerPage)) return;
    currentFeesPage = page;
    renderFees();
}

async function updateFeeStatus(id, newStatus) {
    let payload = { Status: newStatus };

    if (newStatus === 'Rejected') {
        const note = await showPrompt('Please enter a reason for rejection (Admin Note):');
        if (note === null) {
            // User cancelled the prompt, revert the dropdown
            loadFees();
            return;
        }
        if (!note.trim()) {
            showToast('A rejection reason is required.', 'warning');
            loadFees();
            return;
        }
        payload.AdminNote = note.trim();
        payload.deleteReceipt = true; // Flag for backend to delete image file
    } else if (newStatus === 'Paid') {
        const transId = await showPrompt('Please enter the Transaction ID:');
        if (transId === null) {
            loadFees();
            return;
        }
        if (!transId.trim()) {
            showToast('Transaction ID is required to mark as Paid.', 'warning');
            loadFees();
            return;
        }
        const transDate = await showPrompt('Please enter the Payment Date:');
        if (transDate === null) {
            loadFees();
            return;
        }
        if (!transDate.trim()) {
            showToast('Payment Date is required.', 'warning');
            loadFees();
            return;
        }
        payload.AdminNote = `Txn ID: ${transId.trim()} | Date: ${transDate.trim()}`;
        payload.deleteReceipt = true; // Flag for backend to delete image file
    } else {
        if (!await showConfirm(`Are you sure you want to mark this payment as ${newStatus}?`)) {
            loadFees(); // Revert dropdown
            return;
        }
    }

    try {
        await apiFetch('/fees/' + id + '/verify', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        loadFees();
        if (typeof loadPaymentHistory === 'function') loadPaymentHistory(); // Refresh the history table automatically
        loadDashboardStats();
    } catch (error) {
        showToast('Error updating fee status: ' + error.message, 'error');
        loadFees();
    }
}

async function deleteReceiptImage(id) {
    if (!await showConfirm('Are you sure you want to delete this receipt image? This cannot be undone.')) return;
    try {
        await apiFetch('/fees/' + id + '/receipt', {
            method: 'DELETE'
        });
        showToast('Receipt image deleted successfully', 'success');
        loadFees();
    } catch (error) {
        showToast('Error deleting receipt: ' + error.message, 'error');
    }
}

async function updateRemark(id) {

    const note = document.getElementById(`note-${id}`).value.trim();

    if (!note) {
        showToast("Remark cannot be empty", "warning");
        return;
    }

    try {

        await apiFetch('/fees/' + id + '/verify', {
            method: 'PUT',
            body: JSON.stringify({
                AdminNote: note
            })
        });

        showToast("Remark updated", "success");

        loadFees();

    } catch (err) {

        showToast("Error updating remark", "error");

    }

}
// Profile Update Req Paginations
let currentRequests = [];
let requestsPage = 1;
const requestsPerPage = 10;

async function loadRequests() {
    const list = document.getElementById('requestsList');
    list.innerHTML = 'Loading requests...';
    try {
        const data = await apiFetch('/admin/profile-requests');
        if (data && data.length > 0) {
            currentRequests = data;
            requestsPage = 1;
            renderRequests();
        } else {
            list.innerHTML = '<p>No active profile requests.</p>';
            if (document.getElementById('requestsPagination')) document.getElementById('requestsPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderRequests() {
    const list = document.getElementById('requestsList');
    const startIndex = (requestsPage - 1) * requestsPerPage;
    const endIndex = startIndex + requestsPerPage;
    const paginatedData = currentRequests.slice(startIndex, endIndex);

    list.innerHTML = paginatedData.map(req => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <strong>Request from: ${req.StudentId ? `${req.StudentId.FullName} (ID: ${req.StudentId.LibraryID || 'N/A'})` : 'Unknown'}</strong>
                        <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${req.Status === 'Under Review' ? 'var(--primary-color)' : 'var(--warning-color)'}; font-weight: 600;">
                            ${req.Status}
                        </span>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.02); padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--card-border);">
                        <h5 style="margin-bottom:8px; color:var(--text-secondary);">Requested Changes (Check to approve):</h5>
                        ${Object.entries(req.ProposedData).map(([key, val]) => {
                            const currentVal = req.StudentId && req.StudentId[key] ? req.StudentId[key] : '<em style="opacity: 0.5;">(empty)</em>';
                            return `
                            <div style="display:flex; align-items:center; gap:10px; font-size:0.9em; margin-bottom:6px;">
                                <input type="checkbox" id="req_${req._id}_${key}" value="${key}" checked style="cursor: pointer; width: 16px; height: 16px;">
                                <span style="font-weight:600; color:var(--text-primary); width:120px;">${key}:</span>
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <span style="color:var(--error-color); text-decoration: line-through; font-size: 0.85em;">${currentVal}</span>
                                    <span style="color:var(--success-color); font-weight: 500;">${val || '<em style="opacity: 0.5;">(empty)</em>'}</span>
                                </div>
                            </div>
                        `}).join('')}
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-end;">
                        <label style="font-size:0.9em;">Action:</label>
                        <select onchange="handleRequestAction('${req._id}', this)" style="padding: 6px; border-radius: 6px; border: 1px solid var(--card-border); background:var(--card-bg); color:var(--text-primary); width: auto;">
                            <option value="" disabled selected>Select Action...</option>
                            <option value="Under Review">Mark as Under Review</option>
                            <option value="Approve" style="color: green; font-weight:bold;">Approve Selected</option>
                            <option value="Reject" style="color: red; font-weight:bold;">Reject All</option>
                        </select>
                    </div>
                </div>
            `).join('');

    renderRequestsPagination();
}

function renderRequestsPagination() {
    const pagination = document.getElementById('requestsPagination');
    if (!pagination) return;
    const totalPages = Math.ceil(currentRequests.length / requestsPerPage);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${requestsPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeRequestsPage(${requestsPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${requestsPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeRequestsPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${requestsPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeRequestsPage(${requestsPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

window.changeRequestsPage = function(page) {
    if (page < 1 || page > Math.ceil(currentRequests.length / requestsPerPage)) return;
    requestsPage = page;
    renderRequests();
}

async function handleRequestAction(id, selectElement) {
    const action = selectElement.value;
    if (!action) return;

    if (action === 'Approve') {
        await approveRequest(id, selectElement);
    } else if (action === 'Reject') {
        await rejectRequest(id, selectElement);
    } else if (action === 'Under Review') {
        try {
            await apiFetch(`/admin/profile-requests/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ Status: 'Under Review' })
            });
            loadRequests();
            loadDashboardStats();
        } catch (error) { 
            showToast(error.message, 'error'); 
            if (selectElement) selectElement.value = '';
        }
    }
}

async function approveRequest(id, selectElement) {
    const request = currentRequests.find(r => r._id === id);
    if (!request) return;

    const approvedFields = [];
    Object.keys(request.ProposedData).forEach(key => {
        const checkbox = document.getElementById(`req_${id}_${key}`);
        if (checkbox && checkbox.checked) {
            approvedFields.push(key);
        }
    });

    if (approvedFields.length === 0) {
        showToast('Please select at least one field to approve, or choose Reject instead.', 'warning');
        if (selectElement) selectElement.value = '';
        return;
    }

    if (!await showConfirm(`Approve ${approvedFields.length} selected change(s)?`)) {
        if (selectElement) selectElement.value = '';
        return;
    }
    try {
        await apiFetch('/admin/profile-requests/' + id + '/approve', { 
            method: 'PUT',
            body: JSON.stringify({ approvedFields })
        });
        loadRequests();
        loadDashboardStats();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        if (selectElement) selectElement.value = '';
    }
}

async function rejectRequest(id, selectElement) {
    const reason = await showPrompt("Please provide a reason for rejecting this request (optional, will be shown to the student).");
    if (reason === null) {
        if (selectElement) selectElement.value = '';
        return; // User clicked cancel
    }

    try {
        await apiFetch('/admin/profile-requests/' + id + '/reject', {
            method: 'PUT',
            body: JSON.stringify({
                reason: reason || 'No reason provided.'
            })
        });
        loadRequests();
        loadDashboardStats();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        if (selectElement) selectElement.value = '';
    }
}

// Announcements Logic & Paginations
let currentAnnouncementsAdmin = [];
let announcementsAdminPage = 1;
const announcementsAdminPerPage = 5; // Smaller count since these are larger cards

async function loadAnnouncements() {
    const list = document.getElementById('announcementsList');
    list.innerHTML = 'Loading announcements...';
    try {
        const data = await apiFetch('/announcements');
        if (data && data.length > 0) {
            currentAnnouncementsAdmin = data;
            announcementsAdminPage = 1;
            renderAnnouncementsAdmin();
        } else {
            list.innerHTML = '<p>No previous announcements.</p>';
            if (document.getElementById('announcementsPagination')) document.getElementById('announcementsPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderAnnouncementsAdmin() {
    const list = document.getElementById('announcementsList');
    const startIndex = (announcementsAdminPage - 1) * announcementsAdminPerPage;
    const endIndex = startIndex + announcementsAdminPerPage;
    const paginatedData = currentAnnouncementsAdmin.slice(startIndex, endIndex);

    list.innerHTML = paginatedData.map(ann => `
                <div style="border-bottom: 2px solid black; padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <div style="font-size: 1.1em; font-weight: 600; color: var(--primary-color);"><i class="fa-solid fa-tag"></i> ${ann.Title}</div>
                        <button onclick="deleteAnnouncement('${ann._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #ef4444; color: #ef4444; border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-trash"></i> </button>
                    </div>
                    <div style="font-size:0.9em; color:var(--text-secondary); margin-bottom:10px; display:flex; align-items:center; gap:12px;">
                        
                        <span>
                            <i class="fa-solid fa-calendar-days" style="margin-right:4px;"></i>
                            ${new Date(ann.createdAt)
                            .toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})
                            .replace(/ /g,'-')}
                        </span>

                        <span>
                            <i class="fa-solid fa-clock" style="margin-right:4px;"></i>
                            ${new Date(ann.createdAt)
                            .toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}
                        </span>
                        

                    </div>
                    <div style="white-space: pre-wrap;">${ann.Message}</div>
                    ${ann.ImageURL ? `<div style="margin-top: 10px;"><img src="${ann.ImageURL}" style="max-width: 100%; max-height: 200px; border-radius: 8px; cursor: pointer; border: 1px solid var(--card-border);" onclick="openImageModal('${ann.ImageURL}')"></div>` : ''}
                </div>
            `).join('');

    renderAnnouncementsPagination();
}

function renderAnnouncementsPagination() {
    const pagination = document.getElementById('announcementsPagination');
    if (!pagination) return;
    const totalPages = Math.ceil(currentAnnouncementsAdmin.length / announcementsAdminPerPage);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${announcementsAdminPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeAnnouncementsPage(${announcementsAdminPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${announcementsAdminPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeAnnouncementsPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${announcementsAdminPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeAnnouncementsPage(${announcementsAdminPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

window.changeAnnouncementsPage = function(page) {
    if (page < 1 || page > Math.ceil(currentAnnouncementsAdmin.length / announcementsAdminPerPage)) return;
    announcementsAdminPage = page;
    renderAnnouncementsAdmin();
}

window.toggleAnnouncementForm = function() {
    const container = document.getElementById('announcementFormContainer');
    const btn = document.getElementById('toggleAnnBtn');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Close';
            btn.classList.replace('btn', 'btn-outline');
        }
    } else {
        container.style.display = 'none';
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-plus"></i> New Post';
            btn.classList.replace('btn-outline', 'btn');
        }
        document.getElementById('announcementForm').reset();
    }
}

async function createAnnouncement(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Posting...';
    btn.disabled = true;

    try {
        const title = document.getElementById('announcementTitle').value;
        const content = document.getElementById('announcementContent').value;
        const imageFile = document.getElementById('announcementImage').files[0];

        const formData = new FormData();
        formData.append('Title', title);
        formData.append('Message', content);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        await apiFetch('/announcements', {
            method: 'POST',
            body: formData
        });

        document.getElementById('announcementTitle').value = '';
        document.getElementById('announcementContent').value = '';
        document.getElementById('announcementImage').value = '';
        showToast('Announcement posted successfully!', 'success');
        toggleAnnouncementForm(); // Auto-collapse the form after successful post
        loadAnnouncements();
    } catch (error) {
        showToast('Error posting announcement: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteAnnouncement(id) {
    if (!await showConfirm('Are you sure you want to delete this announcement?')) return;
    try {
        await apiFetch('/announcements/' + id, { method: 'DELETE' });
        loadAnnouncements();
    } catch (error) {
        showToast('Error deleting announcement: ' + error.message, 'error');
    }
}

// --- Aadhar Verification Logic ---
let currentAadharStudents = [];
let filteredAadharStudents = [];
let currentAadharPage = 1;
const aadharPerPage = 10;
let aadharSearchTimeout = null;

async function loadAadhar() {
    const list = document.getElementById('aadharList');
    if (!list) return;
    list.innerHTML = 'Loading Aadhar records...';
    try {
        const data = await apiFetch('/admin/students');
        if (data && data.length > 0) {
            currentAadharStudents = data;
            filterAadhar(true);
        } else {
            list.innerHTML = '<p>No student records found.</p>';
            document.getElementById('aadharPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// Bulk Notify Not Uploaded
async function bulkNotifyNotUploaded() {
    if (!await showConfirm('Are you sure you want to send a push notification reminder to ALL students who have "Not Uploaded" their Aadhar?')) return;
    
    try {
        showToast('Sending notifications...', 'info');
        const res = await apiFetch('/admin/aadhar/notify-not-uploaded', { method: 'POST' });
        showToast(res.message, 'success');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

window.filterAadhar = function(immediate = false) {
    const searchInput = document.getElementById('aadharSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = document.getElementById('filterAadharStatus') ? document.getElementById('filterAadharStatus').value : '';

    if (aadharSearchTimeout) clearTimeout(aadharSearchTimeout);

    const executeFilter = () => {
        filteredAadharStudents = currentAadharStudents.filter(student => {
            const name = (student.FullName || student.FirstName + ' ' + (student.LastName || '')).toLowerCase();
            const contact = (student.Contact || '').toLowerCase();
            const libId = (student.LibraryID || '').toLowerCase();
            const aadhar = (student.AadharNumber || '').toLowerCase();
            
            const matchesQuery = name.includes(query) || contact.includes(query) || libId.includes(query) || aadhar.includes(query);
            
            const actualStatus = student.AadharStatus || 'Not Uploaded';
            const matchesStatus = statusFilter === '' || actualStatus === statusFilter;

            return matchesQuery && matchesStatus;
        });
        currentAadharPage = 1;
        renderAadhar();
    };

    if (immediate) executeFilter();
    else aadharSearchTimeout = setTimeout(executeFilter, 300);
}

function renderAadhar() {
    const list = document.getElementById('aadharList');
    if (!list) return;

    const startIndex = (currentAadharPage - 1) * aadharPerPage;
    const endIndex = startIndex + aadharPerPage;
    const paginatedStudents = filteredAadharStudents.slice(startIndex, endIndex);

    if (paginatedStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No records match your search.</p>';
        document.getElementById('aadharPagination').innerHTML = '';
        return;
    }

    list.innerHTML = paginatedStudents.map(student => {
        const status = student.AadharStatus || 'Not Uploaded';
        return `
        <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${student.ProfilePictureURL || '/img/default-avatar.png'}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--card-border);">
                    <div>
                        <strong style="font-size: 1.05em; color: var(--primary-color);">${student.FullName || student.FirstName + ' ' + (student.LastName || '')}</strong>
                        <div style="font-size: 0.85em; color: var(--text-secondary);">ID: ${student.LibraryID || 'N/A'} | Aadhar No: ${student.AadharNumber || 'N/A'}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    ${status === 'Verified' ? `<span style="font-size: 0.85em; color: var(--success-color); padding: 4px 8px; border: 1px solid currentColor; background: var(--bg-color); border-radius: 12px;"><i class="fa-solid fa-shield-check"></i> Verified</span>` : ''}
                    ${status === 'Rejected' ? `<span style="font-size: 0.85em; color: var(--error-color); padding: 4px 8px; border: 1px solid currentColor; background: var(--bg-color); border-radius: 12px;" title="Reason: ${student.AadharRejectionReason || 'Invalid'}"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>` : ''}
                    ${status === 'Pending' ? `<span style="font-size: 0.85em; color: var(--warning-color); padding: 4px 8px; border: 1px solid currentColor; background: var(--bg-color); border-radius: 12px;"><i class="fa-solid fa-clock"></i> Pending</span>` : ''}
                    ${status === 'Not Uploaded' ? `<span style="font-size: 0.85em; color: var(--text-secondary); padding: 4px 8px; border: 1px solid currentColor; background: var(--bg-color); border-radius: 12px;"><i class="fa-solid fa-circle-exclamation"></i> Not Uploaded</span>` : ''}

                    ${student.AadharProofURL ? 
                        `<button onclick="window.open('${student.AadharProofURL}', '_blank')" class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: #6B7280; color: #6B7280; border-radius: 6px; font-size: 0.85em;" title="View Aadhar Document"><i class="fa-solid fa-file-image"></i> View Document</button>` 
                        : ''
                    }
                    ${(status === 'Pending' || (status === 'Not Uploaded' && student.AadharProofURL)) ? 
                        `<button onclick="verifyAadhar('${student._id}', 'Verified')" class="btn" style="padding: 0.3rem 0.6rem; background: var(--success-color); border-color: var(--success-color); border-radius: 6px; font-size: 0.85em;"><i class="fa-solid fa-check"></i> Approve</button>
                        <button onclick="rejectAadhar('${student._id}')" class="btn" style="padding: 0.3rem 0.6rem; background: var(--error-color); border-color: var(--error-color); border-radius: 6px; font-size: 0.85em;"><i class="fa-solid fa-xmark"></i> Reject</button>` 
                        : ''
                    }
                </div>
            </div>
            ${status === 'Rejected' && student.AadharRejectionReason ? `<div style="font-size: 0.85em; color: var(--error-color); margin-top: 5px; padding: 5px 10px; background: var(--bg-color); border-radius: 6px; border-left: 3px solid var(--error-color);"><strong>Reason for Rejection:</strong> ${student.AadharRejectionReason}</div>` : ''}
        </div>
    `}).join('');

    renderAadharPagination();
}

function renderAadharPagination() {
    const pagination = document.getElementById('aadharPagination');
    if (!pagination) return;
    const totalPages = Math.ceil(filteredAadharStudents.length / aadharPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentAadharPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeAadharPage(${currentAadharPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${currentAadharPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeAadharPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentAadharPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeAadharPage(${currentAadharPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

window.changeAadharPage = function(page) {
    if (page < 1 || page > Math.ceil(filteredAadharStudents.length / aadharPerPage)) return;
    currentAadharPage = page;
    renderAadhar();
}

// Issues Logic
async function loadIssues() {
    const list = document.getElementById('issuesList');
    list.innerHTML = 'Loading issues...';
    try {
        const data = await apiFetch('/issues');
        if (data && data.length > 0) {
            currentIssues = data;
            filterIssues(true);
        } else {
            list.innerHTML = '<p>No issues reported.</p>';
            document.getElementById('issuesPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function filterIssues(immediate = false) {
    const searchInput = document.getElementById('issueSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = document.getElementById('filterIssueStatus') ? document.getElementById('filterIssueStatus').value : '';

    if (searchTimeout) clearTimeout(searchTimeout);

    const executeFilter = () => {
        filteredIssues = currentIssues.filter(issue => {
            const title = (issue.IssueTitle || '').toLowerCase();
            const desc = (issue.Description || '').toLowerCase();
            const studentName = issue.StudentId ? (issue.StudentId.FullName || '').toLowerCase() : '';
            const libId = issue.StudentId ? (issue.StudentId.LibraryID || '').toLowerCase() : '';
            const issueStatus = (issue.Status || '');
            
            const matchesQuery = title.includes(query) || desc.includes(query) || studentName.includes(query) || libId.includes(query) || issueStatus.toLowerCase().includes(query);
            
            let matchesStatus = true;
            if (statusFilter === 'Open') {
                matchesStatus = ['Pending', 'Seen by Admin', 'In Progress'].includes(issueStatus);
            } else if (statusFilter !== '') {
                matchesStatus = issueStatus === statusFilter;
            }

            return matchesQuery && matchesStatus;
        });
        currentIssuesPage = 1;
        renderIssues();
    };

    if (immediate) executeFilter();
    else searchTimeout = setTimeout(executeFilter, 300);
}

function renderIssues() {
    const list = document.getElementById('issuesList');
    const startIndex = (currentIssuesPage - 1) * issuesPerPage;
    const endIndex = startIndex + issuesPerPage;
    const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

    list.innerHTML = paginatedIssues.map(issue => `
                <div style="border-bottom: 1px solid red; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <div style="font-size: 1.1em; font-weight: 600; color: var(--primary-color);">${issue.IssueTitle}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px; display: flex; gap: 10px; flex-wrap: wrap;"><span><i class="fa-solid fa-user"></i> ${issue.StudentId ? `${issue.StudentId.FullName} (ID: ${issue.StudentId.LibraryID || 'N/A'})` : 'Unknown'}</span> <span><i class="fa-solid fa-phone"></i> ${issue.StudentId ? issue.StudentId.Contact : 'N/A'}</span> <span><i class="fa-solid fa-chair"></i> Seat: ${issue.StudentId ? issue.StudentId.SeatNo : 'N/A'}</span></div>
                            <div style="font-size: 0.85em; color: var(--text-secondary);">${new Date(issue.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')} <span style="margin:0 5px; opacity:0.6">|</span> ${new Date(issue.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${issue.Status === 'Resolved' ? 'var(--success-color)' : (issue.Status === 'Pending' ? 'var(--error-color)' : 'var(--warning-color)')}; font-weight: 600;">
                                ${issue.Status}
                            </span>
                        ${issue.IssueTitle === 'Attendance Override Request' && issue.Status !== 'Resolved' ? `<button onclick="window.location.hash='#attendance'; setTimeout(openManualCheckInModal, 300);" class="btn" style="padding: 0.2rem 0.5rem; font-size: 0.85em; margin-left: 5px;"><i class="fa-solid fa-user-check"></i> Fix Attendance</button>` : ''}
                            <button onclick="replyToIssue('${issue._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: var(--primary-color); color: var(--primary-color); border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-reply"></i> Reply</button>
                            ${issue.Status === 'Resolved' ? `<button onclick="deleteIssue('${issue._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: var(--error-color); color: var(--error-color); border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
                        </div>
                    </div>
                    <div style="margin-bottom: 15px; font-size: 0.95em; white-space: pre-wrap; word-break: break-word;">${issue.Description}</div>
                    ${issue.AdminResponse ? `
                    <div style="
                    margin-bottom:15px;
                    font-size:0.9em;
                    background:var(--bg-color);
                    padding:10px;
                    border-radius:6px;
                    border-left:3px solid var(--primary-color);
                    border-right:3px solid var(--primary-color);
                    color:var(--primary-color);
                    word-break:break-word;
                    display:inline-block;
                    ">
                    <strong><i class="fa-solid fa-reply"></i></strong> ${issue.AdminResponse}
                    </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label for="status-${issue._id}" style="font-size: 0.85em; font-weight: 600;">Status:</label>
                        <select id="status-${issue._id}" onchange="updateIssueStatus('${issue._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); cursor: pointer; width: auto;" ${issue.Status === 'Resolved' ? 'disabled' : ''}>
                            <option value="Pending" ${issue.Status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Seen by Admin" ${issue.Status === 'Seen by Admin' ? 'selected' : ''}>Seen by Admin</option>
                            <option value="In Progress" ${issue.Status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Resolved" ${issue.Status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                </div>
            `).join('');

    renderIssuesPagination();
}

function renderIssuesPagination() {
    const pagination = document.getElementById('issuesPagination');
    const totalPages = Math.ceil(filteredIssues.length / issuesPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentIssuesPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeIssuesPage(${currentIssuesPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${currentIssuesPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changeIssuesPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${currentIssuesPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changeIssuesPage(${currentIssuesPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

function changeIssuesPage(page) {
    if (page < 1 || page > Math.ceil(filteredIssues.length / issuesPerPage)) return;
    currentIssuesPage = page;
    renderIssues();
}

async function updateIssueStatus(id, newStatus) {
    try {
        await apiFetch('/issues/' + id, {
            method: 'PUT',
            body: JSON.stringify({ Status: newStatus })
        });
        // loadIssues(); // Optional: reload to refresh UI, or just trust the select change
        // We can reload to get correct styling on the badge
        loadIssues();
        loadDashboardStats();
    } catch (error) {
        showToast('Error updating status: ' + error.message, 'error');
        loadIssues(); // reload to revert a failed change
    }
}

async function replyToIssue(id) {
    const reply = await showPrompt('Enter your reply/note for this issue (students will see this):');
    if (reply === null) return;

    try {
        await apiFetch('/issues/' + id, {
            method: 'PUT',
            body: JSON.stringify({ AdminResponse: reply })
        });
        showToast('Reply saved successfully', 'success');
        loadIssues();
        loadDashboardStats();
    } catch (error) {
        showToast('Error saving reply: ' + error.message, 'error');
    }
}

async function deleteIssue(id) {
    if (!await showConfirm('Are you sure you want to delete this resolved issue?')) return;
    try {
        await apiFetch('/issues/' + id, { method: 'DELETE' });
        loadIssues();
        loadDashboardStats();
    } catch (error) {
        showToast('Error deleting issue: ' + error.message, 'error');
    }
}

// --- Custom UI Helpers ---
function injectCustomUI() {
    // Toast Container
    if (!document.getElementById('toast-container')) {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
    }
    // Custom Confirm/Prompt Modal
    if (!document.getElementById('customModalOverlay')) {
        const div = document.createElement('div');
        div.id = 'customModalOverlay';
        div.className = 'custom-modal-overlay';
        div.innerHTML = `
            <div class="custom-box">
                <h3 id="customModalTitle">Confirm</h3>
                <p id="customModalMessage" style="white-space: pre-wrap; margin-bottom: 15px; line-height: 1.4;"></p>
                <div id="customModalInputContainer" style="display:none; margin-bottom: 1rem;">
                    <input type="text" id="customModalInput" style="width: 100%; padding: 0.5rem; border: 1px solid var(--input-border); border-radius: 4px; font-size: 1rem; background: var(--input-bg); color: var(--text-primary);">

                </div>
                <div class="custom-actions">
                    <button id="customModalCancel" class="btn btn-cancel">Cancel</button>
                    <button id="customModalConfirm" class="btn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }
}

function showToast(message, type = 'info') { 
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info" style="color:var(--primary-color)"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color:#10B981"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color:#EF4444"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation" style="color:#F59E0B"></i>';

    toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">${icon} <span>${message}</span></div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showConfirm(message) {
    return showPrompt(message, false);
}


function showPrompt(message, isPrompt = true, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        const inputContainer = document.getElementById('customModalInputContainer');
        const input = document.getElementById('customModalInput');
        
        document.getElementById('customModalTitle').textContent = isPrompt ? 'Input Required' : 'Confirm';
        document.getElementById('customModalMessage').textContent = message;
        inputContainer.style.display = isPrompt ? 'block' : 'none';
        input.value = '';
        input.value = defaultValue;

        const confirmBtn = document.getElementById('customModalConfirm');
        const cancelBtn = document.getElementById('customModalCancel');

        const cleanup = () => {
            overlay.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => { cleanup(); resolve(isPrompt ? input.value : true); };
        cancelBtn.onclick = () => { cleanup(); resolve(isPrompt ? null : false); };

        overlay.classList.add('active');
        if(isPrompt) input.focus();
    });
}

// Initialize UI Helpers immediately
injectCustomUI();

// --- Theme / Dark Mode Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    }
}

window.toggleTheme = function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const icon = document.getElementById('themeIcon');

    if (isDark) {
        localStorage.setItem('theme', 'dark');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        localStorage.setItem('theme', 'light');
        if (icon) icon.classList.replace('fa-sun', 'fa-moon');
    }
}

function openImageModal(url) {
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

window.closeImageModal = function() {
    document.getElementById('imageModal').style.display = 'none';
    document.getElementById('modalImage').src = '';
}

// --- Payment History Table Logic & Paginations ---
let currentPaymentHistory = [];
let filteredPaymentHistory = [];
let paymentHistoryPage = 1;
const paymentHistoryPerPage = 10;
let paymentHistorySearchTimeout = null;

window.loadPaymentHistory = async function() {
    const list = document.getElementById('paymentHistoryList');
    if (!list) return; 
    list.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading payment history...</td></tr>';
    try {
        const data = await apiFetch('/fees'); 
        if (data && data.length > 0) {
            // Filter only fees that are successfully paid/approved
            currentPaymentHistory = data.filter(fee => fee.Status === 'Paid' || fee.Status === 'Approved');
            filterPaymentHistory(true);
        } else {
            list.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No payment history found.</td></tr>';
            document.getElementById('paymentHistoryPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center; padding: 20px;">Error: ${error.message}</td></tr>`;
    }
}

window.filterPaymentHistory = function(immediate = false) {
    const searchInput = document.getElementById('paymentHistorySearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    if (paymentHistorySearchTimeout) clearTimeout(paymentHistorySearchTimeout);

    const executeFilter = () => {
        filteredPaymentHistory = currentPaymentHistory.filter(fee => {
            const studentName = fee.StudentId ? (fee.StudentId.FullName || '').toLowerCase() : '';
            const libId = fee.StudentId ? (fee.StudentId.LibraryID || '').toLowerCase() : '';
            const month = (fee.Month || '').toLowerCase();
            const batch = (fee.Batch || (fee.StudentId?.batchType || '')).toLowerCase();
            const amount = String(fee.Amount || '');
            const note = (fee.AdminNote || '').toLowerCase();
            
            return studentName.includes(query) || libId.includes(query) || month.includes(query) || batch.includes(query) || amount.includes(query) || note.includes(query);
        });
        paymentHistoryPage = 1;
        renderPaymentHistory();
    };

    if (immediate) executeFilter();
    else paymentHistorySearchTimeout = setTimeout(executeFilter, 300);
}

function renderPaymentHistory() {
    const list = document.getElementById('paymentHistoryList');
    if (!list) return;

    const startIndex = (paymentHistoryPage - 1) * paymentHistoryPerPage;
    const endIndex = startIndex + paymentHistoryPerPage;
    const paginatedHistory = filteredPaymentHistory.slice(startIndex, endIndex);

    if (paginatedHistory.length === 0) {
        list.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No payment history matches your search.</td></tr>';
        document.getElementById('paymentHistoryPagination').innerHTML = '';
        return;
    }

    list.innerHTML = paginatedHistory.map(fee => {
        const studentName = fee.StudentId ? fee.StudentId.FullName : 'Unknown';
        const libId = fee.StudentId ? (fee.StudentId.LibraryID || 'N/A') : 'N/A';
        const plan = fee.StudentId ? (fee.StudentId.planDuration || 'N/A') : 'N/A';
        const batch = fee.Batch || (fee.StudentId ? fee.StudentId.batchType : 'N/A');
        
        // Parse the formatted AdminNote to cleanly extract Txn ID and Date
        let txnId = 'N/A';
        let userPaidDate = 'N/A';
        if (fee.AdminNote) {
            const parts = fee.AdminNote.split('|');
            if (parts.length >= 2) {
                txnId = parts[0].replace('Txn ID:', '').trim();
                userPaidDate = parts[1].replace('Date:', '').trim();
            } else {
                txnId = fee.AdminNote; 
            }
        }

        // Format digital signature timestamp to IST
        const verifiedDate = new Date(fee.updatedAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });

        return `
            <tr style="border-bottom: 1px solid var(--card-border); background: var(--card-bg);">
                <td style="padding: 12px 15px;">
                    <div style="font-weight: 600; color: var(--text-primary);">${studentName}</div>
                    <div style="font-size: 0.85em; color: var(--text-secondary);">ID: ${libId}</div>
                </td>
                <td style="padding: 12px 15px; color: var(--text-primary);">${fee.Month}</td>
                <td style="padding: 12px 15px; color: var(--text-secondary);">${plan} <br><span style="font-size: 0.9em;">(${batch})</span></td>
                <td style="padding: 12px 15px; font-weight: 600; color: var(--text-primary);">₹${fee.Amount}</td>
                <td style="padding: 12px 15px;">
                    <div style="font-size: 0.95em; color: var(--text-primary);">${txnId}</div>
                    <div style="font-size: 0.85em; color: var(--text-secondary);"><i class="fa-regular fa-calendar"></i> ${userPaidDate}</div>
                </td>
                <td style="padding: 12px 15px;">
                    <div style="font-size: 0.85em; color: var(--success-color); font-family: monospace; display: flex; align-items: center; gap: 5px; font-weight: 600;">
                        <i class="fa-solid fa-file-signature"></i> Verified by Admin
                    </div>
                    <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 2px;">${verifiedDate}</div>
                </td>
                <td style="padding: 12px 15px; text-align: center;">
                    <i class="fa-solid fa-circle-check" style="color: var(--success-color); font-size: 1.5em;" title="Verified & Paid"></i>
                </td>
            </tr>
        `;
    }).join('');

    renderPaymentHistoryPagination();
}

function renderPaymentHistoryPagination() {
    const pagination = document.getElementById('paymentHistoryPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredPaymentHistory.length / paymentHistoryPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${paymentHistoryPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changePaymentHistoryPage(${paymentHistoryPage - 1})"`}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); cursor: pointer; ${paymentHistoryPage === i ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);' : 'color: var(--text-primary);'}" onclick="changePaymentHistoryPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-outline" style="padding: 0.3rem 0.6rem; border-color: var(--card-border); color: var(--text-primary); cursor: pointer;" ${paymentHistoryPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : `onclick="changePaymentHistoryPage(${paymentHistoryPage + 1})"`}>Next</button>`;
    pagination.innerHTML = html;
}

window.changePaymentHistoryPage = function(page) {
    if (page < 1 || page > Math.ceil(filteredPaymentHistory.length / paymentHistoryPerPage)) return;
    paymentHistoryPage = page;
    renderPaymentHistory();
}

// --- Attendance Logic ---
let currentAttendance = [];
let filteredAttendance = [];

window.loadAttendance = async function() {
    const dateInput = document.getElementById('attendanceDateFilter');
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
    }
    const dateVal = dateInput ? dateInput.value : todayStr;
    const list = document.getElementById('attendanceList');
    
    if(list) list.innerHTML = 'Loading attendance data...';
    try {
        const records = await apiFetch(`/admin/attendance?date=${dateVal}`);
        currentAttendance = records;
        filterAttendance();
    } catch (e) {
        if(list) list.innerHTML = `<p style="color:red;">Error loading records: ${e.message}</p>`;
    }
}

window.filterAttendance = function() {
    const searchInput = document.getElementById('attendanceSearch');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (!query) {
        filteredAttendance = [...currentAttendance];
    } else {
        filteredAttendance = currentAttendance.filter(r => {
            const stuName = (r.StudentId && r.StudentId.FullName) ? r.StudentId.FullName.toLowerCase() : '';
            const libId = r.LibraryID ? r.LibraryID.toLowerCase() : (r.StudentId && r.StudentId.LibraryID ? r.StudentId.LibraryID.toLowerCase() : '');
            return stuName.includes(query) || libId.includes(query);
        });
    }
    renderAttendance(filteredAttendance);
}

function renderAttendance(records) {
    const list = document.getElementById('attendanceList');
    if(!records || records.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No attendance records found for this date.</p>';
        return;
    }

    let html = '<style>.attendance-swipe-container::-webkit-scrollbar { display: none; }</style>';

    html += records.map(r => {
        const inTime = r.CheckInTime ? new Date(r.CheckInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--';
        
        let outTime = r.CheckOutTime ? new Date(r.CheckOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--';
        if (r.CheckOutTime && r.CheckOutMethod === 'Admin') {
            outTime += ` <span style="color: var(--warning-color); font-weight: bold; font-size: 0.85em; margin-left: 2px;" title="Checked out manually by Admin">(A)</span>`;
        } else if (r.CheckOutTime && r.CheckOutMethod === 'Auto') {
            outTime += ` <span style="color: var(--text-secondary); font-weight: bold; font-size: 0.85em; margin-left: 2px;" title="Auto Checked Out">(Auto)</span>`;
        }

        let hrs = '--';
        if (r.TotalHours) {
            hrs = String(Math.floor(Math.round(r.TotalHours * 60) / 60)).padStart(2, '0') + ':' + String(Math.round(r.TotalHours * 60) % 60).padStart(2, '0') + ' hrs';
        } else if (r.CheckInTime) {
            const diffMins = Math.floor((new Date() - new Date(r.CheckInTime)) / 60000);
            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            hrs = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' hrs <span style="color: var(--success-color); font-size: 0.8em; margin-left: 4px;" title="Currently in library"><i class="fa-solid fa-circle-dot fa-fade"></i></span>';
        }

        const stuName = r.StudentId ? r.StudentId.FullName : 'Unknown Student';
        const libId = r.LibraryID || (r.StudentId ? r.StudentId.LibraryID : '--');
        
        return `<div style="border: 1px solid var(--card-border); padding: 12px; border-radius: 8px; margin-bottom: 12px; background: var(--input-bg);">
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                <div style="flex: 1 1 200px; min-width: 0;">
                    <strong style="color: var(--primary-color); font-size: 1.05em; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${stuName}</strong>
                    <div style="font-size:0.85em; color:var(--text-secondary);">ID: ${libId}</div>
                </div>
                <div class="attendance-swipe-container" style="display: flex; flex: 1 1 100%; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px;">
                    <div style="flex: 1 0 100px; scroll-snap-align: center; background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center;">
                        <span style="color:var(--text-secondary); font-size: 0.8em; display:block; margin-bottom: 4px;">In</span> 
                        <strong style="color:var(--success-color); font-size: 0.95em; white-space: nowrap;">${inTime}</strong>
                    </div>
                    <div style="flex: 1 0 100px; scroll-snap-align: center; background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center; display: flex; flex-direction: column; justify-content: center;">
                        <span style="color:var(--text-secondary); font-size: 0.8em; display:block; margin-bottom: 4px;">Out</span> 
                        ${r.CheckOutTime 
                            ? `<strong style="color:var(--error-color); font-size: 0.95em; white-space: nowrap;">${outTime}</strong>`
                            : `<button onclick="manualCheckOut('${r._id}')" class="btn-outline" style="padding: 3px 8px; font-size: 0.75em; border-color: var(--error-color); color: var(--error-color); width: 100%; border-radius: 6px;">Manual Out</button>`
                        }
                    </div>
                    <div style="flex: 1 0 100px; scroll-snap-align: center; background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center;">
                        <span style="color:var(--text-secondary); font-size: 0.8em; display:block; margin-bottom: 4px;">Total</span> 
                        <strong style="font-size: 0.95em; white-space: nowrap;">${hrs}</strong>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    list.innerHTML = html;
}

window.manualCheckOut = async function(id) {
    if (!await showConfirm('Are you sure you want to manually check out this student now?')) return;
    try {
        await apiFetch(`/admin/attendance/${id}/checkout`, { method: 'PUT' });
        showToast('Student checked out successfully.', 'success');
        loadAttendance();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

window.openManualCheckInModal = async function() {
    if (currentStudents.length === 0) await loadStudents();
    const select = document.getElementById('manualCheckInStudentId');
    
    const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');
    select.innerHTML = '<option value="" disabled selected>Select an active student...</option>' + 
        activeStudents.map(s => `<option value="${s._id}">${s.FullName} (${s.LibraryID || 'No ID'})</option>`).join('');
        
    document.getElementById('manualCheckInModal').style.display = 'block';
}

window.closeManualCheckInModal = function() {
    document.getElementById('manualCheckInModal').style.display = 'none';
}

window.submitManualCheckIn = async function(e) {
    e.preventDefault();
    const studentId = document.getElementById('manualCheckInStudentId').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Checking In...';
    try {
        await apiFetch('/admin/attendance', { method: 'POST', body: JSON.stringify({ studentId }) });
        showToast('Checked in successfully!', 'success');
        closeManualCheckInModal();
        loadAttendance();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    }
}

window.toggleTheme = function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const icon = document.getElementById('themeIcon');

    if (isDark) {
        localStorage.setItem('theme', 'dark');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        localStorage.setItem('theme', 'light');
        if (icon) icon.classList.replace('fa-sun', 'fa-moon');
    }
}

// --- Wi-Fi Settings Management ---
window.loadWifiSettings = async function() {
    try {
        const data = await apiFetch('/config/wifi');
        if (document.getElementById('wifiHall1Network')) {
            if(document.getElementById('wifiHall1Title')) document.getElementById('wifiHall1Title').value = data.hall1.title || 'Hall 01';
            document.getElementById('wifiHall1Network').value = data.hall1.network;
            document.getElementById('wifiHall1Password').value = data.hall1.password;
            if(document.getElementById('wifiHall2Title')) document.getElementById('wifiHall2Title').value = data.hall2.title || 'Hall 02 + Premium Rooms';
            document.getElementById('wifiHall2Network').value = data.hall2.network;
            document.getElementById('wifiHall2Password').value = data.hall2.password;
        }

        // Also load GPS Location settings
        const locData = await apiFetch('/config/location');
        if (document.getElementById('libLat')) {
            document.getElementById('libLat').value = locData.lat || '';
            document.getElementById('libLng').value = locData.lng || '';
        }
    } catch (error) {
        console.error('Error loading Wi-Fi config', error);
    }
}

window.saveWifiSettings = async function(e) {
    if (e) e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...'; }

    const payload = {
        hall1: { 
            title: document.getElementById('wifiHall1Title') ? document.getElementById('wifiHall1Title').value : 'Hall 01',
            network: document.getElementById('wifiHall1Network').value, 
            password: document.getElementById('wifiHall1Password').value 
        },
        hall2: { 
            title: document.getElementById('wifiHall2Title') ? document.getElementById('wifiHall2Title').value : 'Hall 02 + Premium Rooms',
            network: document.getElementById('wifiHall2Network').value, 
            password: document.getElementById('wifiHall2Password').value 
        }
    };

    try {
        await apiFetch('/admin/config/wifi', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Wi-Fi settings updated successfully!', 'success');
    } catch (error) {
        showToast('Error saving Wi-Fi settings: ' + error.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Settings'; }
    }
}

window.saveLocationSettings = async function(e) {
    if (e) e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...'; }
    try {
        const payload = { lat: document.getElementById('libLat').value, lng: document.getElementById('libLng').value };
        await apiFetch('/admin/config/location', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Library coordinates saved securely!', 'success');
    } catch (error) {
        showToast('Error saving coordinates: ' + error.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-map-pin"></i> Save Coordinates'; }
    }
}

window.autoDetectLocation = function() {
    if (navigator.geolocation) {
        showToast('Detecting location...', 'info');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                if(document.getElementById('libLat')) document.getElementById('libLat').value = position.coords.latitude;
                if(document.getElementById('libLng')) document.getElementById('libLng').value = position.coords.longitude;
                showToast('Location detected! Click Save Coordinates.', 'success');
            },
            (error) => {
                showToast(error.code === 1 ? 'Please allow location access in your browser settings.' : 'Failed to get location.', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        showToast("Geolocation is not supported by your browser.", "error");
    }
}

function openImageModal(url) {
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

window.closeImageModal = function() {
    document.getElementById('imageModal').style.display = 'none';
    document.getElementById('modalImage').src = '';
}
