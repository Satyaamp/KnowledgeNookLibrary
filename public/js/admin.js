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

window.updateNavBadge = function (type, count) {
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
    reader.onload = function (e) {
        reader.onload = function (e) {
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

        const contactClean = row.Contact ? row.Contact.replace(/\D/g, '') : '';
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
                    .replace(/ /g, '-')
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

    function sendWhatsApp(studentId) {

        const student = currentStudents.find(s => s._id === studentId);
        if (!student) return;

        const name = student.FirstName;
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


    window.changeInterestedPage = function (page) {
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

    async function promptConvertStudent(id) {
        if (!currentSeatConfig || !currentSeatConfig.halls || currentSeatConfig.halls.length === 0) {
            await loadSeatConfig();
        }

        document.getElementById('convertStudentId').value = id;
        document.getElementById('convertDate').valueAsDate = new Date();
        document.getElementById('convertMsg').textContent = '';

        const hallSelect = document.getElementById('convertAssignedHall');
        if (hallSelect && currentSeatConfig.halls) {
            hallSelect.innerHTML = '<option value="">Select Hall...</option>' +
                currentSeatConfig.halls.map(h => `<option value="${h.name}">${h.name} (${h.start}-${h.end})</option>`).join('');
        }
        const seatSelect = document.getElementById('convertSeatNo');
        if (seatSelect) seatSelect.innerHTML = '<option value="">Select Hall & Timing first</option>';

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

    window.updateAvailableSeatsInConvertModal = function () {
        const hallSelect = document.getElementById('convertAssignedHall');
        const timingInput = document.getElementById('convertBatchTiming');
        const seatSelect = document.getElementById('convertSeatNo');

        if (!hallSelect || !seatSelect || !timingInput) return;

        const selectedHallName = hallSelect.value;
        const currentTiming = timingInput.value.trim().toLowerCase();

        if (!selectedHallName) {
            seatSelect.innerHTML = '<option value="">Select Hall first...</option>';
            return;
        }
        if (!currentTiming) {
            seatSelect.innerHTML = '<option value="">Enter Batch Timing first...</option>';
            return;
        }

        const hall = currentSeatConfig.halls.find(h => h.name === selectedHallName);
        if (!hall) return;

        const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');

        const occupiedSeats = new Set();
        activeStudents.forEach(s => {
            if (s.SeatNo && s.batchTiming && s.batchTiming.trim().toLowerCase() === currentTiming) {
                const num = parseInt(s.SeatNo.replace(/\D/g, ''), 10);
                if (!isNaN(num)) occupiedSeats.add(num);
            }
        });

        seatSelect.innerHTML = '<option value="">Select an available seat...</option>';
        let hasAvailable = false;

        for (let i = hall.start; i <= hall.end; i++) {
            if (!occupiedSeats.has(i)) {
                hasAvailable = true;
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Seat ${i}`;
                seatSelect.appendChild(option);
            }
        }

        if (!hasAvailable) {
            seatSelect.innerHTML = '<option value="">No seats available for this timing</option>';
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


    async function viewStudent(id, isReadOnly = false) {
        const student = currentStudents.find(s => s._id === id);
        if (!student) return;

        if (!currentSeatConfig || !currentSeatConfig.halls || currentSeatConfig.halls.length === 0) {
            await loadSeatConfig();
        }

        let currentHallName = '';
        if (student.SeatNo) {
            const numericSeat = parseInt(student.SeatNo.replace(/\D/g, ''), 10);
            if (!isNaN(numericSeat) && currentSeatConfig && currentSeatConfig.halls) {
                const hall = currentSeatConfig.halls.find(h => numericSeat >= h.start && numericSeat <= h.end);
                if (hall) currentHallName = hall.name;
            }
        }

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
        <div class="form-group">
            <label>Joining Date</label>
            <input type="date" id="modalJoiningDate" value="${student.JoiningDate ? new Date(student.JoiningDate).toISOString().split('T')[0] : ''}">
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
            setTimeout(updateAvailableSeatsInModal, 100);
        }

        document.getElementById('modalStudentId').value = student._id;
        modal.style.display = 'block';
    }

    window.updateAvailableSeatsInModal = function () {
        const hallSelect = document.getElementById('modalAssignedHall');
        const timingInput = document.getElementById('modalBatchTiming');
        const seatSelect = document.getElementById('modalSeatNo');
        const studentIdInput = document.getElementById('modalStudentId');

        if (!hallSelect || !seatSelect || !timingInput || !studentIdInput) return;

        const studentId = studentIdInput.value;
        const selectedHallName = hallSelect.value;
        const currentTiming = timingInput.value.trim().toLowerCase();

        if (!selectedHallName) {
            seatSelect.innerHTML = '<option value="">Select Hall first...</option>';
            return;
        }
        if (!currentTiming) {
            seatSelect.innerHTML = '<option value="">Enter Batch Timing first...</option>';
            return;
        }

        const hall = currentSeatConfig.halls.find(h => h.name === selectedHallName);
        if (!hall) return;

        const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');

        const occupiedSeats = new Set();
        activeStudents.forEach(s => {
            if (s._id !== studentId && s.SeatNo && s.batchTiming && s.batchTiming.trim().toLowerCase() === currentTiming) {
                const num = parseInt(s.SeatNo.replace(/\D/g, ''), 10);
                if (!isNaN(num)) occupiedSeats.add(num);
            }
        });

        let currentSeatNum = null;
        const student = currentStudents.find(s => s._id === studentId);
        if (student && student.SeatNo) {
            currentSeatNum = parseInt(student.SeatNo.replace(/\D/g, ''), 10);
        }

        seatSelect.innerHTML = '<option value="">Select an available seat...</option>';
        let hasAvailable = false;

        for (let i = hall.start; i <= hall.end; i++) {
            if (!occupiedSeats.has(i)) {
                hasAvailable = true;
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Seat ${i}`;
                if (currentSeatNum === i && (student.batchTiming || '').trim().toLowerCase() === currentTiming) {
                    option.selected = true;
                }
                seatSelect.appendChild(option);
            }
        }

        if (!hasAvailable) {
            seatSelect.innerHTML = '<option value="">No seats available for this timing</option>';
        }
    }

    async function resetStudentPassword(id) {
        if (!await showConfirm('Are you sure you want to reset this student\'s password to the default ("library@123")?')) return;


        try {
            await apiFetch('/admin/students/' + id, {
                method: 'PUT',
                body: JSON.stringify({ ResetPassword: true })
            });
            showToast('Password reset to "library@123" successfully.', 'success');
        } catch (e) {
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

    window.sendEmailReminder = async function (id) {
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
                amount: document.getElementById('modalAmount').value,
                JoiningDate: document.getElementById('modalJoiningDate') ? document.getElementById('modalJoiningDate').value : undefined
            };

            await apiFetch('/admin/students/' + id, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            showToast('Student profile updated successfully!', 'success');
            closeStudentModal();
            loadStudents(); // Refresh the list
        } catch (error) {
            showToast(error.message, 'error');
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
            const pendingOrRejectedFees = data ? data.filter(fee => fee.Status !== 'Paid' && fee.Status !== 'Approved') : [];
            if (pendingOrRejectedFees.length > 0) {
                currentFees = pendingOrRejectedFees;
                filterFees(true);
            } else {
                list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No pending fee records to verify.</p>';
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

        list.innerHTML = paginatedFees.map(fee => {
            let displayMonth = (fee.Month || 'N/A').charAt(0).toUpperCase() + (fee.Month || '').slice(1);
            const plan = fee.StudentId ? fee.StudentId.planDuration : 'Monthly';
            let monthInc = 1;
            if (plan === 'Quarterly') monthInc = 3;
            else if (plan === 'Half-Yearly') monthInc = 6;
            else if (plan === 'Yearly') monthInc = 12;

            if (monthInc > 1 && fee.Month) {
                const d = new Date(fee.Month);
                if (!isNaN(d.getTime())) {
                    const dEnd = new Date(d.getFullYear(), d.getMonth() + monthInc - 1, 1);
                    const startStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    const endStr = dEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    displayMonth = `${startStr} to ${endStr}`;
                }
            }
            return `
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
                        <div><strong>Month:</strong> ${displayMonth}</div>
                       
                        <div><u><strong>Plan:</strong> ${fee.planDuration ||
                        (fee.StudentId
                            ? `${fee.StudentId.planDuration || 'N/A'} (${fee.StudentId.batchType || 'N/A'})`
                            : 'N/A'
                        )
                        }</u></div>
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
            `}).join('');

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
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            let transDate = await showPrompt('Please select the Payment Date:', true, todayStr, 'date');
            if (transDate === null) {
                loadFees();
                return;
            }
            if (!transDate.trim()) {
                showToast('Payment Date is required.', 'warning');
                loadFees();
                return;
            }
            
            if (transDate.includes('-')) {
                const [yyyy, mm, dd] = transDate.split('-');
                transDate = `${dd}-${mm}-${yyyy}`;
            }

            // Fetch next available receipt number to pre-fill the prompt
            let nextReceipt = '';
            try {
                showToast('Fetching next receipt number...', 'info');
                const data = await apiFetch('/admin/next-receipt-number');
                if (data && data.nextReceiptNumber) {
                    nextReceipt = data.nextReceiptNumber;
                }
            } catch (e) {
                console.warn("Could not fetch next receipt number, leaving prompt empty.", e);
            }

            const receiptNo = await showPrompt('Please enter the receipt number:', true, nextReceipt);
            if (receiptNo === null) {
                loadFees();
                return;
            }
            if (!receiptNo.trim()) {
                showToast('Receipt No is required.', 'warning');
                loadFees();
                return;
            }
            payload.AdminNote = `Txn ID: ${transId.trim()} | Date: ${transDate.trim()}`;
            payload.ReceiptNo = receiptNo.trim();
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

    window.changeRequestsPage = function (page) {
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
                .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                .replace(/ /g, '-')}
                        </span>

                        <span>
                            <i class="fa-solid fa-clock" style="margin-right:4px;"></i>
                            ${new Date(ann.createdAt)
                .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
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


    window.changeAnnouncementsPage = function (page) {
        if (page < 1 || page > Math.ceil(currentAnnouncementsAdmin.length / announcementsAdminPerPage)) return;
        announcementsAdminPage = page;
        renderAnnouncementsAdmin();
    }

    window.toggleAnnouncementForm = function () {
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

   
        window.filterAadhar = function (immediate = false) {
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

       
            window.changeAadharPage = function (page) {
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


                function showPrompt(message, isPrompt = true, defaultValue = '', inputType = 'text') {
                    return new Promise((resolve) => {
                        const overlay = document.getElementById('customModalOverlay');
                        const inputContainer = document.getElementById('customModalInputContainer');
                        const input = document.getElementById('customModalInput');


                        document.getElementById('customModalTitle').textContent = isPrompt ? 'Input Required' : 'Confirm';
                        document.getElementById('customModalMessage').textContent = message;
                        inputContainer.style.display = isPrompt ? 'block' : 'none';
                        if (isPrompt) input.type = inputType;
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
                        if (isPrompt) input.focus();
                        if (isPrompt) input.focus();
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

                
                    window.toggleTheme = function () {
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

                  
                        window.closeImageModal = function () {
                            document.getElementById('imageModal').style.display = 'none';
                            document.getElementById('modalImage').src = '';
                        }

                        // --- Payment History Table Logic & Paginations ---
                        let currentPaymentHistory = [];
                        let filteredPaymentHistory = [];
                        let paymentHistoryPage = 1;
                        const paymentHistoryPerPage = 10;
                        let paymentHistorySearchTimeout = null;

                        window.loadPaymentHistory = async function () {
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

                        window.filterPaymentHistory = function (immediate = false) {
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

                            const totalAmount = filteredPaymentHistory.reduce((sum, fee) => sum + (Number(fee.Amount) || 0), 0);
                            const totalAmountEl = document.getElementById('paymentHistoryTotalAmount');
                            if (totalAmountEl) {
                                totalAmountEl.textContent = '₹' + totalAmount.toLocaleString('en-IN');
                            }

                            const startIndex = (paymentHistoryPage - 1) * paymentHistoryPerPage;
                            const endIndex = startIndex + paymentHistoryPerPage;
                            const paginatedHistory = filteredPaymentHistory.slice(startIndex, endIndex);

                            if (paginatedHistory.length === 0) {
                                list.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No payment history matches your search.</td></tr>';
                                document.getElementById('paymentHistoryPagination').innerHTML = '';
                                return;
                            }

                            list.innerHTML = paginatedHistory.map(fee => {
                                let displayMonth = fee.Month || 'N/A';
                                const planDuration = fee.StudentId ? fee.StudentId.planDuration : 'Monthly';
                                let monthInc = 1;
                                if (planDuration === 'Quarterly') monthInc = 3;
                                else if (planDuration === 'Half-Yearly') monthInc = 6;
                                else if (planDuration === 'Yearly') monthInc = 12;

                                if (monthInc > 1 && fee.Month) {
                                    const d = new Date(fee.Month);
                                    if (!isNaN(d.getTime())) {
                                        const dEnd = new Date(d.getFullYear(), d.getMonth() + monthInc - 1, 1);
                                        const startStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                        const endStr = dEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                        displayMonth = `${startStr} to ${endStr}`;
                                    }
                                }

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
                    <div style="font-size: 0.85em; color: var(--text-secondary); font-weight: 600; margin-top: 4px;">Receipt: ${fee.ReceiptNo || 'N/A'}</div>
                </td>
                <td style="padding: 12px 15px; color: var(--text-primary);">${displayMonth}</td>
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
                <td style="padding: 12px 15px; text-align: center;">
                    <button onclick="shareReceipt('${fee._id}')" class="btn" style="padding: 6px 12px; font-size: 0.85em; background: #25D366; border: none; color: white; display: inline-flex; align-items: center; gap: 5px;" title="Download PDF & Share on WhatsApp">
                        <i class="fa-brands fa-whatsapp" style="font-size: 1.2em;"></i> Share
                    </button>
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


                            window.changePaymentHistoryPage = function (page) {
                                if (page < 1 || page > Math.ceil(filteredPaymentHistory.length / paymentHistoryPerPage)) return;
                                paymentHistoryPage = page;
                                renderPaymentHistory();
                            }


window.shareReceipt = async function (feeId) {
    const fee = currentPaymentHistory.find(f =>
        (f._id && f._id.$oid === feeId) || f._id === feeId
    );
    if (!fee) return showToast('Fee record not found', 'error');

    const student        = fee.StudentId || {};
    const studentName    = student.FullName      || "Student";
    const studentContact = student.Contact       || "";
    const studentAddress = student.FullAddress   || student.Area || "";
    const libraryId      = student.LibraryID     || fee.LibraryID || "N/A";
    const seatNo         = student.SeatNo        || "N/A";
    const feeMonth       = fee.Month             || "N/A";
    const batchName      = fee.Batch             || student.batchType || "Fundamental";
    const planDuration   = fee.planDuration      || student.planDuration || "Monthly";

    let displayMonth = feeMonth;
    let monthInc = 1;
    if (planDuration === 'Quarterly') monthInc = 3;
    else if (planDuration === 'Half-Yearly') monthInc = 6;
    else if (planDuration === 'Yearly') monthInc = 12;

    if (monthInc > 1 && fee.Month && fee.Month !== "N/A") {
        const d = new Date(fee.Month);
        if (!isNaN(d.getTime())) {
            const dEnd = new Date(d.getFullYear(), d.getMonth() + monthInc - 1, 1);
            const startStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const endStr = dEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            displayMonth = `${startStr} to ${endStr}`;
        }
    }

    let txnId = "N/A", paymentDate = "N/A";
    if (fee.AdminNote) {
        const note     = fee.AdminNote;
        const txnMatch = note.match(/Txn\s*ID:\s*([^|]+)/i);
        const dtMatch  = note.match(/Date:\s*([^|]+)/i);
        txnId       = txnMatch ? txnMatch[1].trim() : "N/A";
        paymentDate = dtMatch  ? dtMatch[1].trim()  : "N/A";
    }

    // const receiptNo   = fee.ReceiptNo || (student.SeatNo ? `KNL-${student.SeatNo}` : `KNL-${Date.now().toString().slice(-4)}`);
    const receiptNo   = fee.ReceiptNo || `Marked by Admin`;
    const generatedOn = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'2-digit' });

    // OVERLAY
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px 0 40px;overflow-y:auto;font-family:'Segoe UI',Arial,sans-serif;`;
    overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });

    // RECEIPT — pink paper style matching physical receipt
    const receiptDiv = document.createElement('div');
    receiptDiv.style.cssText = `width:100%;max-width:520px;background:#fce8e8;flex-shrink:0;overflow:hidden;color:#1a0a0a;font-family:'Times New Roman',serif;`;

    receiptDiv.innerHTML = `
<div style="padding:24px 28px 20px;background:#fce8e8;border:2px solid #c0a0a0;">

  <!-- TOP ROW: MONEY RECEIPT + contact -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
    <div style="flex:1;"></div>
    <div style="text-align:center;flex:2;">
      <div style="font-size:13px;font-weight:700;text-decoration:underline;letter-spacing:1px;color:#222;">FEE RECEIPT</div>
    </div>
    <div style="flex:2;text-align:right;font-size:11px;color:#333;line-height:1.6;">
      <div>Mob. : 8102003094</div>
      <div>7903547986</div>
    </div>
  </div>

  <!-- LIBRARY NAME -->
  <div style="text-align:center;margin-bottom:4px;">
    <div style="font-size:26px;font-weight:900;color:#1a0a0a;letter-spacing:1px;line-height:1.1;font-family:'Arial Black',Arial,sans-serif;">KNOWLEDGE NOOK LIBRARY</div>
    <div style="font-size:11px;font-weight:700;color:#333;margin-top:3px;letter-spacing:0.3px;">B.M.P.-16, NEAR PNB BANK, PHULWARI SHARIF, PATNA</div>
    <div style="font-size:11px;font-weight:600;color:#333;margin-top:1px;">Director : ROHIT KUMAR</div>
  </div>

  <!-- DIVIDER -->
  <div style="border-top:2px solid #333;border-bottom:1px solid #333;margin:10px 0;height:3px;"></div>

  <!-- NO + DATE ROW -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
    <div style="font-size:13px;font-weight:700;color:#222;">
      No. &nbsp;<span style="font-size:18px;font-weight:900;font-family:'Arial Black',Arial;">${receiptNo}</span>
    </div>
    <div style="font-size:13px;font-weight:700;color:#222;">
      Date: <span style="font-size:15px;font-weight:900;border-bottom:1px solid #555;padding-bottom:1px;">${paymentDate !== 'N/A' ? paymentDate : generatedOn}</span>
    </div>
  </div>

  <!-- NAME OF CANDIDATE -->
  <div style="margin-bottom:12px;border-bottom:1px dotted #888;padding-bottom:8px;">
    <span style="font-size:12px;font-weight:700;color:#333;">Name of Candidate........</span>
    <span style="font-size:15px;font-weight:900;color:#1a0a0a;font-family:'Arial Black',Arial;letter-spacing:0.3px;">${studentName}</span>
  </div>

  <!-- ADDRESS + MOB -->
  <div style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px dotted #888;padding-bottom:8px;">
    <div style="flex:2;font-size:12px;color:#333;">
      <span style="font-weight:700;">Address........</span>
      <span style="font-weight:600;color:#1a0a0a;">${studentAddress || '—'}</span>
    </div>
    <div style="flex:1;font-size:12px;color:#333;text-align:right;">
      <span style="font-weight:700;">Mob. </span>
      <span style="font-weight:600;color:#1a0a0a;">${studentContact || '—'}</span>
    </div>
  </div>

  <!-- BATCH + SEAT + MONTH -->
  <div style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px dotted #888;padding-bottom:8px;align-items:flex-end;">
    <div style="flex:1.5;font-size:12px;color:#333;">
      <span style="font-weight:700;">Batch........</span>
      <span style="font-weight:900;color:#1a0a0a;">${batchName}</span>
    </div>
    <div style="flex:1;font-size:12px;color:#333;">
      <span style="font-weight:700;">Seat No. </span>
      <span style="font-weight:900;color:#1a0a0a;">${seatNo}</span>
    </div>
    <div style="flex:1.5;font-size:12px;color:#333;">
      <span style="font-weight:700;">Month : </span>
      <span style="font-weight:900;color:#1a0a0a;">${feeMonth}</span>
    </div>
  </div>

  <!-- TOTAL AMOUNT ROW -->
  <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px dotted #888;padding-bottom:8px;align-items:center;">
    <div style="flex:2;font-size:12px;color:#333;">
      <span style="font-weight:700;">Total Amount : </span>
      <span style="font-weight:900;color:#1a0a0a;font-size:14px;">&#8377;${fee.Amount}</span>
    </div>
    <div style="flex:1.5;font-size:12px;color:#333;">
      <span style="font-weight:700;">Paid : </span>
      <span style="font-weight:900;color:#1a0a0a;">&#8377;${fee.Amount}</span>
    </div>
    <div style="flex:1;font-size:12px;color:#333;">
      <span style="font-weight:700;">Dues : </span>
      <span style="font-weight:900;color:#1a0a0a;">0</span>
    </div>
  </div>

  <!-- BOTTOM: Rupee stamp + Txn ID + Signature -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;">

    <!-- Rupee circle stamp -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:72px;height:72px;border:3px solid #1a0a0a;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fce8e8;">
        <div style="font-size:16px;font-weight:900;color:#1a0a0a;">&#8377;</div>
        <div style="font-size:17px;font-weight:900;color:#1a0a0a;line-height:1;">${fee.Amount}</div>
      </div>
    </div>

    <!-- Txn ID in center -->
    <div style="text-align:center;flex:1;padding:0 12px;">
      <div style="font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Transaction ID</div>
      <div style="font-size:12px;font-weight:900;color:#1a0a0a;font-family:monospace;">${txnId}</div>
      <div style="font-size:10px;color:#555;margin-top:4px;">Plan: ${planDuration}</div>
    </div>

    <!-- Signature area -->
    <div style="text-align:center;min-width:80px;">
      <div style="border-top:1px solid #333;padding-top:4px;font-size:11px;font-weight:700;color:#333;">-Signature</div>
    </div>
  </div>

  <!-- BOTTOM NOTE -->
  <div style="border-top:1px solid #888;padding-top:8px;">
    <div style="font-size:10px;color:#444;font-weight:600;">नोट:- किसी भी स्थिति में फीस वापस नहीं होगा।</div>
    <div style="font-size:9px;color:#888;margin-top:3px;text-align:right;">Lib. ID: ${libraryId} &nbsp;|&nbsp; Computer Generated Receipt</div>
  </div>

</div>`;

    overlay.appendChild(receiptDiv);
    document.body.appendChild(overlay);
    showToast('Generating Receipt…', 'info');

    setTimeout(() => {
        overlay.style.display = 'none';

        const rW = receiptDiv.scrollWidth || 520;
        const captureWrap = document.createElement('div');
        captureWrap.style.cssText = `position:fixed;top:0;left:0;width:${rW}px;background:#fce8e8;z-index:99998;`;
        captureWrap.appendChild(receiptDiv);
        document.body.appendChild(captureWrap);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            const rH = receiptDiv.scrollHeight || receiptDiv.offsetHeight || 700;

            html2canvas(receiptDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#EE959E',
                width: rW, height: rH,
                windowWidth: rW, windowHeight: rH,
                x: 0, y: 0, scrollX: 0, scrollY: 0,
                logging: false,
            }).then(rawCanvas => {
                document.body.removeChild(captureWrap);

                const MAX_PX = 4096;
                let canvas = rawCanvas;
                if (rawCanvas.width > MAX_PX || rawCanvas.height > MAX_PX) {
                    const ratio = Math.min(MAX_PX / rawCanvas.width, MAX_PX / rawCanvas.height);
                    const s = document.createElement('canvas');
                    s.width  = Math.floor(rawCanvas.width  * ratio);
                    s.height = Math.floor(rawCanvas.height * ratio);
                    s.getContext('2d').drawImage(rawCanvas, 0, 0, s.width, s.height);
                    canvas = s;
                }

                const imgData = canvas.toDataURL('image/jpeg', 0.93);
                const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                const pageW = 210, pageH = 297, margin = 10;
                const cw = canvas.width || 1040, ch = canvas.height || 1400;
                let imgW = pageW - margin * 2;
                let imgH = (ch * imgW) / cw;
                if (imgH > pageH - margin * 2) {
                    imgH = pageH - margin * 2;
                    imgW = (cw * imgH) / ch;
                }
                imgW = Math.max(1, Math.round(imgW * 100) / 100);
                imgH = Math.max(1, Math.round(imgH * 100) / 100);
                pdf.addImage(imgData, 'JPEG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);

                const fileName = `KNL_Receipt_${studentName.replace(/\s+/g,'_')}_${feeMonth.replace(/\s+/g,'_')}.pdf`;
                pdf.save(fileName);

                // Ping backend to track the admin download
                apiFetch(`/fees/${feeId}/track-download`, { method: 'POST' }).catch(e => console.error('Tracking failed', e));


                document.body.removeChild(overlay);
                showToast('Receipt saved! ✓', 'success');

                if (studentContact) {
                    setTimeout(() => {
                        const msg = encodeURIComponent(
                            `Hello ${studentName},\n\nYour receipt for *${displayMonth}* is ready.\n\n` +
                            `Receipt No: ${receiptNo}\nTxn ID: ${txnId}\nDate: ${paymentDate}\nAmount: Rs.${fee.Amount}\n\n` +
                            `Thank you for choosing Knowledge Nook Library!`
                        );
                        window.open(`https://wa.me/91${studentContact}?text=${msg}`, '_blank');
                    }, 1500);
                }

            }).catch(err => {
                console.error('Receipt error:', err);
                if (document.body.contains(captureWrap)) document.body.removeChild(captureWrap);
                document.body.removeChild(overlay);
                showToast('Failed to generate receipt', 'error');
            });
        }));
    }, 800);
};


                            // --- Attendance Logic ---
                            let currentAttendance = [];
                            let filteredAttendance = [];

                         
                                window.loadAttendance = async function () {
                                    const dateInput = document.getElementById('attendanceDateFilter');
                                    const todayStr = new Date().toLocaleDateString('en-CA');


                                    if (dateInput && !dateInput.value) {
                                        dateInput.value = todayStr;
                                    }
                                    const dateVal = dateInput ? dateInput.value : todayStr;
                                    const list = document.getElementById('attendanceList');

                                    if (list) list.innerHTML = 'Loading attendance data...';

                                    if (list) list.innerHTML = 'Loading attendance data...';
                                    try {
                                        const records = await apiFetch(`/admin/attendance?date=${dateVal}`);
                                        currentAttendance = records;
                                        filterAttendance();
                                    } catch (e) {
                                        if (list) list.innerHTML = `<p style="color:red;">Error loading records: ${e.message}</p>`;
                                        if (list) list.innerHTML = `<p style="color:red;">Error loading records: ${e.message}</p>`;
                                    }
                                }

                                
                                    window.filterAttendance = function () {
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
                                        if (!records || records.length === 0) {
                                                list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No attendance records found for this date.</p>';
                                                return;
                 
                                            }

                                            let html = '<style>.attendance-swipe-container::-webkit-scrollbar { display: none; }</style>';

                                            html += records.map(r => {
                                                const inTime = r.CheckInTime ? new Date(r.CheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                                                let outTime = r.CheckOutTime ? new Date(r.CheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

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


                                                return `
                                                <div style="border: 1px solid var(--card-border); padding: 12px; border-radius: 8px; margin-bottom: 12px; background: var(--input-bg);">
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


                                        window.manualCheckOut = async function (id) {
                                            if (!await showConfirm('Are you sure you want to manually check out this student now?')) return;
                                            try {
                                                await apiFetch(`/admin/attendance/${id}/checkout`, { method: 'PUT' });
                                                showToast('Student checked out successfully.', 'success');
                                                loadAttendance();
                                            } catch (e) {
                                                showToast(e.message, 'error');
                                            }
                                        }

                                        window.openManualCheckInModal = async function () {
                                            if (currentStudents.length === 0) await loadStudents();
                                            const select = document.getElementById('manualCheckInStudentId');


                                            const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');
                                            select.innerHTML = '<option value="" disabled selected>Select an active student...</option>' +
                                                activeStudents.map(s => `<option value="${s._id}">${s.FullName} (${s.LibraryID || 'No ID'})</option>`).join('');


                                            document.getElementById('manualCheckInModal').style.display = 'block';
                                        }

                                        window.closeManualCheckInModal = function () {
                                            document.getElementById('manualCheckInModal').style.display = 'none';
                                        }

                                        window.submitManualCheckIn = async function (e) {
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


                                        window.toggleTheme = function () {
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

                                        window.switchSettingsTab = function (tab) {
                                            const tabs = ['wifi', 'attendance', 'seats', 'pricing']; // Example if you add pricing
                                            tabs.forEach(t => {
                                                const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
                                                const content = document.getElementById('settingsTab' + t.charAt(0).toUpperCase() + t.slice(1) + 'Content');


                                                if (t === tab) {
                                                    if (btn) {
                                                        btn.className = 'btn';
                                                        btn.style.cssText = 'padding:8px 16px; border-radius:8px; font-size:0.95em; display:flex; align-items:center; gap:6px; white-space:nowrap; transition: all 0.2s;';
                                                    }
                                                    if (content) content.style.display = 'block';
                                                    if (btn) btn.classList.replace('btn-outline', 'btn');
                                                    if (content) content.style.display = 'block';
                                                } else {
                                                    if (btn) {
                                                        btn.className = 'btn-outline';
                                                        btn.style.cssText = 'padding:8px 16px; border-radius:8px; font-size:0.95em; border:none; color:var(--text-secondary); display:flex; align-items:center; gap:6px; white-space:nowrap; transition: all 0.2s;';
                                                    }
                                                    if (content) content.style.display = 'none';
                                                    if (btn) btn.classList.replace('btn', 'btn-outline');
                                                    if (content) content.style.display = 'none';
                                                }
                                            });
                                        }


                                        window.loadWifiSettings = async function () {
                                            try {
                                                const data = await apiFetch('/config/wifi');
                                                if (document.getElementById('wifiHall1Network')) {
                                                    if (document.getElementById('wifiHall1Title')) document.getElementById('wifiHall1Title').value = data.hall1.title || 'Hall 01';
                                                    if (document.getElementById('wifiHall1Title')) document.getElementById('wifiHall1Title').value = data.hall1.title || 'Hall 01';
                                                    document.getElementById('wifiHall1Network').value = data.hall1.network;
                                                    document.getElementById('wifiHall1Password').value = data.hall1.password;
                                                    if (document.getElementById('wifiHall2Title')) document.getElementById('wifiHall2Title').value = data.hall2.title || 'Hall 02 + Premium Rooms';
                                                    if (document.getElementById('wifiHall2Title')) document.getElementById('wifiHall2Title').value = data.hall2.title || 'Hall 02 + Premium Rooms';
                                                    document.getElementById('wifiHall2Network').value = data.hall2.network;
                                                    document.getElementById('wifiHall2Password').value = data.hall2.password;
                                                }

                                                // Also load IP Settings
                                                const locData = await apiFetch('/config/location');
                                                if (document.getElementById('libIP')) {
                                                    document.getElementById('libIP').value = locData.ip || locData.lat || '';
                                                }
                                            } catch (error) {
                                                console.error('Error loading Wi-Fi config', error);
                                            }
                                        }

                                        window.saveWifiSettings = async function (e) {
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


                                        window.saveIPSettings = async function (e) {
                                            if (e) e.preventDefault();
                                            const btn = e.target.querySelector('button[type="submit"]');
                                            if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...'; }
                                            try {
                                                const ipValue = document.getElementById('libIP').value;
                                                // Send lat/lng as well to bypass strict database schemas that ignore 'ip'
                                                const payload = { ip: ipValue, lat: ipValue, lng: '0' };
                                                await apiFetch('/admin/config/location', { method: 'PUT', body: JSON.stringify(payload) });
                                                showToast('Library IP saved securely!', 'success');
                                            } catch (error) {
                                                showToast('Error saving IP: ' + error.message, 'error');
                                            } finally {
                                                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Library IP'; }
                                            }
                                        }

                                        window.autoDetectIP = async function () {
                                            showToast('Detecting Public IP...', 'info');
                                            try {
                                                const response = await fetch('https://api.ipify.org?format=json');
                                                const data = await response.json();
                                                if (document.getElementById('libIP')) document.getElementById('libIP').value = data.ip;
                                                showToast('IP detected! Click Save Library IP.', 'success');
                                            } catch (error) {
                                                showToast('Failed to detect IP. Are you connected to the internet?', 'error');
                                            }
                                        }

                                        function openImageModal(url) {
                                            document.getElementById('modalImage').src = url;
                                            document.getElementById('imageModal').style.display = 'flex';
                                        }


                                        window.closeImageModal = function () {
                                            document.getElementById('imageModal').style.display = 'none';
                                            document.getElementById('modalImage').src = '';
                                        }


                                        window.downloadQRCode = function () {
                                            showToast('Downloading QR Code...', 'info');
                                            const url = 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=KNL_OFFICIAL_DOOR_QR_V1';
                                            fetch(url)
                                                .then(res => res.blob())
                                                .then(blob => {
                                                    const blobUrl = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.style.display = 'none';
                                                    a.href = blobUrl;
                                                    a.download = 'KnowledgeNook_Door_QR.png';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    window.URL.revokeObjectURL(blobUrl);
                                                    a.remove();
                                                    showToast('QR Code downloaded successfully!', 'success');
                                                })
                                                .catch(() => {
                                                    window.open(url, '_blank');
                                                });
                                        }


                                        window.printQRCode = function () {
                                            const printWindow = window.open('', '_blank');
                                            printWindow.document.write(`
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <title>Print QR Poster</title>
                                                    <style>
                                                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif; background: #fff; }
                                                        .poster { text-align: center; border: 5px solid #000; padding: 60px; border-radius: 30px; max-width: 600px; width: 100%; box-sizing: border-box; }
                                                        .poster h1 { font-size: 3.2em; margin: 0 0 30px 0; color: #000; }
                                                        .poster img { width: 400px; height: 400px; margin-bottom: 30px; border: 2px solid #ccc; border-radius: 10px; }
                                                        .poster h2 { font-size: 2.8em; margin: 0 0 20px 0; color: #000; letter-spacing: 2px; }
                                                        .poster p { font-size: 1.6em; margin: 0; color: #444; line-height: 1.5; font-weight: bold; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="poster">
                                                        <h1>Knowledge Nook Library</h1>
                                                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=KNL_OFFICIAL_DOOR_QR_V1" alt="QR Code">
                                                        <h2>SCAN TO CHECK-IN</h2>
                                                        <p>Please connect to the library Wi-Fi<br>before scanning via your dashboard.</p>
                                                    </div>
                                                    <script>
                                                        setTimeout(() => { window.print(); window.close(); }, 800);
                                                    </script>
                                                </body>
                                                </html>
                                            `);
                                            printWindow.document.close();
                                        }

                                        // --- Live Seat Layout & Configuration Logic ---
                                        let currentSeatConfig = { halls: [] };


                                        window.loadSeatConfig = async function () {
                                            try {
                                                const data = await apiFetch('/admin/config/seats');
                                                currentSeatConfig = data || { halls: [] };
                                                renderHallConfigList();
                                            } catch (error) {
                                                console.error('Error loading seat config', error);
                                            }
                                        }


                                        window.renderHallConfigList = function () {
                                            const list = document.getElementById('hallConfigList');
                                            if (!list) return;
                                            if (!currentSeatConfig.halls || currentSeatConfig.halls.length === 0) {
                                                list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding: 20px; border: 1px dashed var(--card-border); border-radius: 8px;">No halls configured. Click "Add New Hall" below.</p>';
                                                return;
                                            }
                                            list.innerHTML = currentSeatConfig.halls.map((h, i) => `
        <div style="display:flex; flex-wrap: wrap; gap:10px; margin-bottom:15px; align-items:flex-end; background:var(--bg-color); padding:15px; border-radius:8px; border:1px solid var(--card-border);">
            <div style="flex:1; min-width: 150px;">
                <label style="font-size:0.8em; font-weight:600; color:var(--text-secondary);">Hall Name</label>
                <input type="text" id="hallName_${i}" value="${h.name}" placeholder="e.g. Hall 1" style="padding:8px; width:100%; border-radius:6px; border:1px solid var(--input-border);">
            </div>
            <div style="flex:0.5; min-width: 80px;">
                <label style="font-size:0.8em; font-weight:600; color:var(--text-secondary);">Start Seat</label>
                <input type="number" id="hallStart_${i}" value="${h.start}" style="padding:8px; width:100%; border-radius:6px; border:1px solid var(--input-border);">
            </div>
            <div style="flex:0.5; min-width: 80px;">
                <label style="font-size:0.8em; font-weight:600; color:var(--text-secondary);">End Seat</label>
                <input type="number" id="hallEnd_${i}" value="${h.end}" style="padding:8px; width:100%; border-radius:6px; border:1px solid var(--input-border);">
            </div>
            <button type="button" class="btn-outline" onclick="removeHallConfigRow(${i})" style="color:var(--error-color); border-color:var(--error-color); padding:8px 12px; height: 38px;"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
                                        }


                                        window.addHallConfigRow = function () {
                                            if (!currentSeatConfig.halls) currentSeatConfig.halls = [];
                                            currentSeatConfig.halls.push({ name: '', start: 1, end: 50 });
                                            renderHallConfigList();
                                        }


                                        window.removeHallConfigRow = function (index) {
                                            currentSeatConfig.halls.splice(index, 1);
                                            renderHallConfigList();
                                        }


                                        window.saveSeatConfig = async function () {
                                            const halls = [];
                                            if (currentSeatConfig.halls) {
                                                for (let i = 0; i < currentSeatConfig.halls.length; i++) {
                                                    halls.push({
                                                        name: document.getElementById(`hallName_${i}`).value,
                                                        start: parseInt(document.getElementById(`hallStart_${i}`).value),
                                                        end: parseInt(document.getElementById(`hallEnd_${i}`).value)
                                                    });
                                                }
                                            }
                                            try {
                                                await apiFetch('/admin/config/seats', { method: 'PUT', body: JSON.stringify({ halls }) });
                                                showToast('Seat mapping saved successfully!', 'success');
                                                currentSeatConfig.halls = halls;
                                            } catch (error) {
                                                showToast('Error saving seat config: ' + error.message, 'error');
                                            }
                                        }


                                        window.loadSeatLayout = async function () {
                                            if (currentStudents.length === 0) await loadStudents();
                                            if (!currentSeatConfig || !currentSeatConfig.halls || currentSeatConfig.halls.length === 0) await loadSeatConfig();
                                            renderSeatLayout();
                                        }


                                        window.renderSeatLayout = function () {
                                            const container = document.getElementById('seatLayoutContainer');
                                            const batchFilter = document.getElementById('seatBatchFilter') ? document.getElementById('seatBatchFilter').value : '';

                                            if (!currentSeatConfig || !currentSeatConfig.halls || currentSeatConfig.halls.length === 0) {
                                                container.innerHTML = '<div style="text-align:center; padding:40px; background:var(--bg-color); border-radius:8px; border:1px dashed var(--card-border); color:var(--text-secondary);">No seat configuration found. <br><br> Go to <b>Settings -> Seats Mapping</b> to define your halls.</div>';
                                                return;
                                            }

                                            const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');
                                            const filteredStudents = batchFilter ? activeStudents.filter(s => s.batchType === batchFilter) : activeStudents;

                                            const occupiedSeats = {};
                                            filteredStudents.forEach(s => {
                                                if (s.SeatNo) {
                                                    const numericSeat = s.SeatNo.replace(/\D/g, ''); // Extracts pure number from things like "S-12"
                                                    if (numericSeat) {
                                                        if (!occupiedSeats[numericSeat]) occupiedSeats[numericSeat] = [];
                                                        occupiedSeats[numericSeat].push(s);
                                                    }
                                                }
                                            });

                                            let html = '';
                                            currentSeatConfig.halls.forEach(hall => {
                                                let emptyCount = 0; let occupiedCount = 0;
                                                let total = (hall.end - hall.start) + 1;


                                                let gridHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); gap: 10px; margin-top: 20px;">`;


                                                for (let i = hall.start; i <= hall.end; i++) {
                                                    const seatNumStr = i.toString();
                                                    const occupiers = occupiedSeats[seatNumStr];


                                                    if (occupiers && occupiers.length > 0) {
                                                        occupiedCount++;
                                                        const tooltipStr = `Seat ${i}&#10;` + occupiers.map(o => `• ${o.FullName} (${o.batchType || 'No Batch'})`).join('&#10;');
                                                        gridHtml += `<div onclick="viewSeatDetails('${seatNumStr}')" style="aspect-ratio: 1; background: var(--error-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 0.9em; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="${tooltipStr}">${i}</div>`;
                                                    } else {
                                                        emptyCount++;
                                                        gridHtml += `<div style="aspect-ratio: 1; background: var(--success-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; cursor: crosshair; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 0.9em; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Seat ${i} - Available">${i}</div>`;
                                                    }
                                                }
                                                gridHtml += `</div>`;

                                                html += `
            <div style="margin-bottom: 25px; background: var(--bg-color); border: 1px solid var(--card-border); padding: 25px; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed var(--card-border); padding-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h4 style="margin: 0; color: var(--primary-color); font-size: 1.2em;">${hall.name}</h4>
                    <div style="font-size: 0.9em; display: flex; gap: 15px; background: var(--card-bg); padding: 5px 15px; border-radius: 20px; border: 1px solid var(--card-border);">
                        <span style="color: var(--text-secondary);">Total: <strong>${total}</strong></span>
                        <span style="color: var(--success-color);">Empty: <strong>${emptyCount}</strong></span>
                        <span style="color: var(--error-color);">Occupied: <strong>${occupiedCount}</strong></span>
                    </div>
                </div>
                ${gridHtml}
            </div>
        `;
                                            });

                                            container.innerHTML = html;
                                        }

                                        window.viewSeatDetails = function (seatNum) {
                                            const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');
                                            const occupiers = activeStudents.filter(s => s.SeatNo && s.SeatNo.replace(/\D/g, '') === seatNum);


                                            const listContainer = document.getElementById('seatDetailsList');
                                            document.getElementById('seatDetailsTitle').innerHTML = `<i class="fa-solid fa-chair" style="color: var(--primary-color);"></i> Seat ${seatNum} Occupants`;


                                            if (occupiers.length === 0) {
                                                listContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No students currently assigned to this seat.</p>';
                                            } else {
                                                listContainer.innerHTML = occupiers.map(s => `
            <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: var(--primary-color); font-size: 1.1em; display: flex; align-items: center; gap: 8px;"><img src="${s.ProfilePictureURL || '/img/default-avatar.png'}" style="width: 25px; height: 25px; border-radius: 50%; object-fit: cover;"> ${s.FullName}</strong>
                    <span style="font-size: 0.85em; padding: 3px 10px; background: var(--bg-color); border: 1px solid var(--card-border); border-radius: 12px; font-weight: 600;">${s.batchType || 'No Batch'}</span>
                </div>
                <div style="font-size: 0.9em; color: var(--text-secondary); display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; border-top: 1px dashed var(--card-border); padding-top: 10px;">
                    <span><i class="fa-solid fa-id-badge" style="width: 16px;"></i> ${s.LibraryID || 'N/A'}</span>
                    <span><i class="fa-solid fa-phone" style="width: 16px;"></i> ${s.Contact || 'N/A'}</span>
                    <span><i class="fa-solid fa-clock" style="width: 16px;"></i> ${s.batchTiming || 'N/A'}</span>
                </div>
            </div>
        `).join('');
                                            }
                                            document.getElementById('seatDetailsModal').style.display = 'block';
                                        }


                                        window.closeSeatDetailsModal = function () {
                                            document.getElementById('seatDetailsModal').style.display = 'none';
                                        }


                                        // --- Advanced Fee Timeline Logic ---

                                        window.filterTimelineSearch = function () {
                                            const input = document.getElementById('timelineSearch').value.toLowerCase().trim();
                                            const resultsContainer = document.getElementById('timelineSearchResults');

                                            if (!input) {
                                                resultsContainer.style.display = 'none';
                                                return;
                                            }

                                            const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');
                                            const filtered = activeStudents.filter(s =>
                                                (s.FullName && s.FullName.toLowerCase().includes(input)) ||
                                                (s.LibraryID && s.LibraryID.toLowerCase().includes(input))
                                            ).slice(0, 5); // Max 5 results

                                            if (filtered.length === 0) {
                                                resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-secondary); text-align: center;">No students found.</div>';
                                            } else {
                                                resultsContainer.innerHTML = filtered.map(s => `
            <div onclick="selectTimelineStudent('${s._id}')" style="padding: 12px; border-bottom: 1px solid var(--card-border); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='transparent'">
                <div style="font-weight: 600; color: var(--primary-color);">${s.FullName}</div>
                <div style="font-size: 0.85em; color: var(--text-secondary);">ID: ${s.LibraryID || 'N/A'} | Plan: ${s.planDuration || 'N/A'} (₹${s.amount || 0})</div>
            </div>
        `).join('');
                                            }
                                            resultsContainer.style.display = 'block';
                                        }

                                        window.selectTimelineStudent = async function (studentId) {
                                            document.getElementById('timelineSearch').value = '';
                                            document.getElementById('timelineSearchResults').style.display = 'none';

                                            const student = currentStudents.find(s => s._id === studentId);
                                            if (!student) return;

                                            document.getElementById('timelineStudentName').textContent = student.FullName;

                                            let joinText = student.JoiningDate ? new Date(student.JoiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';
                                            document.getElementById('timelineStudentDetails').innerHTML = `ID: ${student.LibraryID || 'N/A'} &nbsp;|&nbsp; Joined: ${joinText} &nbsp;|&nbsp; Plan: ${student.planDuration || 'N/A'} (${student.batchType || 'N/A'} - ₹${student.amount || 0})`;

                                            document.getElementById('timelineContainer').style.display = 'block';
                                            const tbody = document.getElementById('timelineMatrixBody');
                                            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Generating historic timeline...</td></tr>';

                                            try {
                                                const timeline = await apiFetch(`/admin/students/${studentId}/fee-timeline`);

                                                const filteredTimeline = timeline.filter(entry => entry.status === 'Paid' || entry.status === 'Pending' || entry.status === 'Approved');

                                                if (filteredTimeline.length === 0) {
                                                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">No paid or pending records found for this student. Unpaid records can be found in the Unpaid Fees tab.</td></tr>';
                                                    return;
                                                }

                                                tbody.innerHTML = filteredTimeline.map(entry => {
                                                    let statusBadge = '';
                                                    let actionBtn = '';

                                                    if (entry.status === 'Paid' || entry.status === 'Approved') {
                                                        statusBadge = `<span style="background: var(--success-color); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600;"><i class="fa-solid fa-check"></i> Paid</span>`;
                                                        actionBtn = `<span style="color: var(--text-secondary); font-size: 0.9em;">Verified ✓</span>`;
                                                    } else if (entry.status === 'Pending') {
                                                        statusBadge = `<span style="background: var(--warning-color); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600;"><i class="fa-solid fa-clock"></i> Pending Verification</span>`;
                                                        actionBtn = `<button onclick="goToVerifyUploads('${studentId}')" style="background:none; border:none; cursor:pointer; color: var(--warning-color); font-size: 0.9em; text-decoration: underline; font-weight: bold;"><i class="fa-solid fa-magnifying-glass"></i> Awaiting Verification</button>`;
                                                    }

                                                    return `
                                                        <tr style="border-bottom: 1px dashed var(--card-border); transition: background 0.2s;" onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='transparent'">
                                                            <td style="padding: 15px; font-weight: 500; color: var(--text-primary);"><i class="fa-regular fa-calendar" style="color: var(--text-secondary); margin-right: 8px;"></i> ${entry.month}</td>
                                                            <td style="padding: 15px; color: var(--text-secondary); font-weight: 600;">₹${entry.expectedAmount}</td>
                                                            <td style="padding: 15px;">${statusBadge}</td>
                                                            <td style="padding: 15px; text-align: right;">${actionBtn}</td>
                                                        </tr>
                                                    `;
                                                }).join('');

                                            } catch (error) {
                                                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--error-color); padding: 20px;">Error loading timeline: ${error.message}</td></tr>`;
                                            }
                                        }

                                        // --- Pending Fees Logic ---
                                        let currentPendingFees = [];
                                        let filteredPendingFees = [];
                                        let pendingFeesPage = 1;
                                        const pendingFeesPerPage = 10;
                                        let pendingFeesSearchTimeout = null;

                                        window.loadPendingFees = async function() {
                                            const list = document.getElementById('pendingFeesList');
                                            if (!list) return;
                                            list.innerHTML = '<p style="text-align: center; padding: 20px;">Loading unpaid/pending fees...</p>';

                                            try {
                                                if (currentStudents.length === 0) {
                                                    const stuData = await apiFetch('/admin/students');
                                                    currentStudents = stuData || [];
                                                }
                                                
                                                const allFees = await apiFetch('/fees') || [];

                                                const currentDate = new Date();
                                                const maxDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

                                                const activeStudents = currentStudents.filter(s => s.AccountStatus === 'Active');

                                                currentPendingFees = [];

                                                activeStudents.forEach(student => {
                                                    const joinDate = new Date(student.JoiningDate || student.createdAt || new Date());
                                                    let iterDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
                                                    
                                                    const planDuration = student.planDuration || 'Monthly';
                                                    let monthIncrement = 1;
                                                    if (planDuration === 'Quarterly') monthIncrement = 3;
                                                    else if (planDuration === 'Half-Yearly') monthIncrement = 6;
                                                    else if (planDuration === 'Yearly') monthIncrement = 12;

                                                    while (iterDate <= maxDate) {
                                                        const monthName = iterDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).replace(/\s+/g, ' ').trim();

                                                        const studentFeeThisMonth = allFees.find(f => 
                                                            (f.StudentId && f.StudentId._id === student._id || f.StudentId === student._id) && 
                                                            (f.Month || '').toLowerCase() === monthName.toLowerCase()
                                                        );

                                                        let status = 'Unpaid';
                                                        if (studentFeeThisMonth) {
                                                            status = studentFeeThisMonth.Status;
                                                        }

                                                        // Only include if they haven't paid AND haven't submitted for verification yet
                                                        if (status !== 'Paid' && status !== 'Approved' && status !== 'Pending') {
                                                            currentPendingFees.push({
                                                                student: student,
                                                                month: monthName,
                                                                expectedAmount: student.amount || 0,
                                                                status: status
                                                            });
                                                        }
                                                        
                                                        iterDate.setMonth(iterDate.getMonth() + monthIncrement);
                                                    }
                                                });

                                                filterPendingFees(true);
                                            } catch (error) {
                                                list.innerHTML = `<p style="color: red; text-align: center;">Error: ${error.message}</p>`;
                                            }
                                        }

                                        window.filterPendingFees = function(immediate = false) {
                                            const searchInput = document.getElementById('pendingFeeSearch');
                                            const query = searchInput ? searchInput.value.toLowerCase() : '';

                                            if (pendingFeesSearchTimeout) clearTimeout(pendingFeesSearchTimeout);

                                            const executeFilter = () => {
                                                filteredPendingFees = currentPendingFees.filter(item => {
                                                    const name = (item.student.FullName || item.student.FirstName + ' ' + (item.student.LastName || '')).toLowerCase();
                                                    const libId = (item.student.LibraryID || '').toLowerCase();
                                                    return name.includes(query) || libId.includes(query);
                                                });
                                                pendingFeesPage = 1;
                                                renderPendingFees();
                                            };

                                            if (immediate) executeFilter();
                                            else pendingFeesSearchTimeout = setTimeout(executeFilter, 300);
                                        }

                                        window.renderPendingFees = function() {
                                            const list = document.getElementById('pendingFeesList');
                                            if (!list) return;

                                            const startIndex = (pendingFeesPage - 1) * pendingFeesPerPage;
                                            const endIndex = startIndex + pendingFeesPerPage;
                                            const paginated = filteredPendingFees.slice(startIndex, endIndex);

                                            if (paginated.length === 0) {
                                                list.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No unpaid fees found.</p>';
                                                document.getElementById('pendingFeesPagination').innerHTML = '';
                                                return;
                                            }

                                            list.innerHTML = paginated.map(item => {
                                                let displayMonth = item.month;
                                                const planDuration = item.student.planDuration || 'Monthly';
                                                let monthInc = 1;
                                                if (planDuration === 'Quarterly') monthInc = 3;
                                                else if (planDuration === 'Half-Yearly') monthInc = 6;
                                                else if (planDuration === 'Yearly') monthInc = 12;

                                                if (monthInc > 1 && item.month) {
                                                    const d = new Date(item.month);
                                                    if (!isNaN(d.getTime())) {
                                                        const dEnd = new Date(d.getFullYear(), d.getMonth() + monthInc - 1, 1);
                                                        const startStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                                        const endStr = dEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                                        displayMonth = `${startStr} to ${endStr}`;
                                                    }
                                                }
                                                return `
                                                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                                                        <div>
                                                            <strong style="color: var(--primary-color); font-size: 1.1em;">${item.student.FullName || item.student.FirstName + ' ' + (item.student.LastName || '')}</strong>
                                                            <div style="font-size: 0.85em; color: var(--text-secondary);">ID: ${item.student.LibraryID || 'N/A'} | Plan: ${item.student.planDuration || 'N/A'} (${item.student.batchType || 'N/A'})</div>
                                                        </div>
                                                        <div style="display: flex; align-items: center; gap: 10px;">
                                                            <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; border: 1px solid var(--error-color); background: rgba(239, 68, 68, 0.1); color: var(--error-color); font-weight: 600;">
                                                                <i class="fa-solid fa-xmark"></i> Unpaid
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div style="font-size: 0.95em; color: var(--text-secondary); margin-bottom: 15px; display: flex; gap: 15px;">
                                                        <span><strong>Month:</strong> ${displayMonth}</span>
                                                        <span><strong>Amount:</strong> ₹${item.expectedAmount}</span>
                                                    </div>
                                                    
                                                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                                        <button onclick="overrideMarkPaid('${item.student._id}', '${item.month}', ${item.expectedAmount}, '${item.student.LibraryID || ''}', '${item.student.batchType || ''}')" class="btn" style="padding: 6px 15px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 5px;">
                                                            <i class="fa-solid fa-money-bill-wave"></i> Mark Paid
                                                        </button>
                                                        <button onclick="sendFeeReminder('${item.student._id}', '${item.month}')" class="btn-outline" style="padding: 6px 15px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 5px;">
                                                            <i class="fa-solid fa-bell"></i> Remind
                                                        </button>
                                                        <button onclick="sendWhatsAppFeeReminder('${item.student._id}', '${item.month}', ${item.expectedAmount})" class="btn-outline" style="padding: 6px 15px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 5px; color: #25D366; border-color: #25D366;">
                                                            <i class="fa-brands fa-whatsapp"></i> WhatsApp
                                                        </button>
                                                        <a href="tel:${item.student.Contact}" class="btn-outline" style="padding: 6px 15px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 5px; color: #3b82f6; border-color: #3b82f6; text-decoration: none;">
                                                            <i class="fa-solid fa-phone"></i> Call
                                                        </a>



                                                        
                                                    </div>
                                                </div>
                                            `}).join('');

                                            renderPendingFeesPagination();
                                        }

                                        window.renderPendingFeesPagination = function() {
                                            const pagination = document.getElementById('pendingFeesPagination');
                                            if (!pagination) return;

                                            const totalPages = Math.ceil(filteredPendingFees.length / pendingFeesPerPage);

                                            const totalCountDisplay = `<div style="font-size: 0.9em; color: var(--text-secondary);">Page ${pendingFeesPage} of ${totalPages}</div>`;

                                            if (totalPages <= 1) {
                                                pagination.innerHTML = filteredPendingFees.length > 0 ? totalCountDisplay : '';
                                                return;
                                            }

                                            let buttonsHtml = '';
                                            // Prev button
                                            buttonsHtml += `<button class="btn-outline" style="padding: 0.3rem 0.6rem;" ${pendingFeesPage === 1 ? 'disabled' : `onclick="changePendingFeesPage(${pendingFeesPage - 1})"`}>Prev</button>`;

                                            // Page numbers
                                            for (let i = 1; i <= totalPages; i++) {
                                                if (i === 1 || i === totalPages || (i >= pendingFeesPage - 1 && i <= pendingFeesPage + 1)) {
                                                    if (i === pendingFeesPage) {
                                                        buttonsHtml += `<button class="btn" style="padding: 0.3rem 0.8rem;">${i}</button>`;
                                                    } else {
                                                        buttonsHtml += `<button onclick="changePendingFeesPage(${i})" class="btn-outline" style="padding: 0.3rem 0.8rem;">${i}</button>`;
                                                    }
                                                } else if (i === pendingFeesPage - 2 || i === pendingFeesPage + 2) {
                                                    buttonsHtml += `<span style="padding: 0.3rem; color: var(--text-secondary); align-self: center;">...</span>`;
                                                }
                                            }

                                            // Next button
                                            buttonsHtml += `<button class="btn-outline" style="padding: 0.3rem 0.6rem;" ${pendingFeesPage === totalPages ? 'disabled' : `onclick="changePendingFeesPage(${pendingFeesPage + 1})"`}>Next</button>`;

                                            pagination.innerHTML = `<div style="display: flex; gap: 5px;">${buttonsHtml}</div>` + totalCountDisplay;
                                        }

                                        window.changePendingFeesPage = function(page) {
                                            if (page < 1 || page > Math.ceil(filteredPendingFees.length / pendingFeesPerPage)) return;
                                            pendingFeesPage = page;
                                            renderPendingFees();
                                        }

                                        window.overrideMarkPaid = async function (studentId, month, expectedAmount, libraryId, batch) {
                                            if (!await showConfirm(`Are you sure you want to mark ${month} as Paid? This will bypass image upload and instantly verify the student.`)) return;

                                            try {
                                                await apiFetch(`/admin/students/${studentId}/mark-fee-paid`, {
                                                    method: 'POST',
                                                    body: JSON.stringify({ 
                                                        Month: month, 
                                                        Amount: expectedAmount,
                                                        LibraryID: libraryId,
                                                        Batch: batch
                                                    })
                                                });
                                                showToast(`Successfully marked ${month} as Paid!`, 'success');
                                                
                                                // Refresh whichever view triggered this
                                                if (document.getElementById('feeTabTimelineContent') && document.getElementById('feeTabTimelineContent').style.display === 'block') {
                                                    selectTimelineStudent(studentId);
                                                }
                                                if (document.getElementById('feeTabPendingContent') && document.getElementById('feeTabPendingContent').style.display === 'block') {
                                                    if (typeof loadPendingFees === 'function') loadPendingFees();
                                                }
                                                loadDashboardStats();
                                            } catch (error) {
                                                showToast('Error marking fee as paid: ' + error.message, 'error');
                                            }
                                        }

                                        window.sendFeeReminder = async function (studentId, month) {
                                            const message = await showPrompt(`Send a reminder for ${month}? Edit message below:`, `Your library fee for ${month} is currently due. Please upload your receipt in the portal!`);
                                            if (message === null) return;

                                            try {
                                                await apiFetch(`/admin/students/${studentId}/notify`, {
                                                    method: 'POST',
                                                    body: JSON.stringify({ title: `Fee Reminder - ${month}`, message: message })
                                                });
                                                showToast(`Reminder sent successfully for ${month}!`, 'success');
                                            } catch (error) {
                                                showToast('Error sending reminder: ' + error.message, 'error');
                                            }
                                        }

                                        window.sendWhatsAppFeeReminder = function(studentId, month, amount) {
                                            const student = currentStudents.find(s => s._id === studentId);
                                            if (!student) return;

                                            const name = student.FirstName || 'Student';
                                            const contact = student.Contact;
                                            
                                            if (!contact) {
                                                showToast('Student contact number is missing.', 'error');
                                                return;
                                            }

                                            const msg = `Hello ${name},\n\nThis is a gentle reminder from *Knowledge Nook Library*.\n\nYour library fee for the month of *${month}* (Amount: Rs. ${amount}) is currently pending.\n\nPlease clear your dues at the earliest or upload your receipt in the student portal if already paid.\n\nThank you!\n— Knowledge Nook Library`;
                                            
                                            const url = `https://wa.me/91${contact}?text=${encodeURIComponent(msg)}`;
                                            window.open(url, "_blank");
                                        }

                                        document.addEventListener('click', (e) => {
                                            const searchResult = document.getElementById('timelineSearchResults');
                                            const searchInput = document.getElementById('timelineSearch');
                                            if (searchResult && searchInput && !searchInput.contains(e.target)) {
                                                searchResult.style.display = 'none';
                                            }
                                        });

                                        // Admin Fee Management Internal Tab Switcher
                                        window.switchFeeTab = function (tab) {
                                            const timelineBtn = document.getElementById('feeTabTimelineBtn');
                                            const verifyBtn = document.getElementById('feeTabVerifyBtn');
                                            const historyBtn = document.getElementById('feeTabHistoryBtn');
                                            const pendingBtn = document.getElementById('feeTabPendingBtn');

                                            const timelineContent = document.getElementById('feeTabTimelineContent');
                                            const verifyContent = document.getElementById('feeTabVerifyContent');
                                            const historyContent = document.getElementById('feeTabHistoryContent');
                                            const pendingContent = document.getElementById('feeTabPendingContent');

                                            // Reset all buttons
                                            [timelineBtn, verifyBtn, historyBtn, pendingBtn].forEach(btn => {
                                                if (btn) {
                                                    btn.className = 'btn-outline';
                                                    btn.style.color = 'var(--text-secondary)';
                                                    btn.style.border = 'none';
                                                }
                                            });

                                            // Hide all contents
                                            [timelineContent, verifyContent, historyContent, pendingContent].forEach(content => {
                                                if (content) content.style.display = 'none';
                                            });

                                            // Activate selected
                                            if (tab === 'timeline') {
                                                if (timelineBtn) { timelineBtn.className = 'btn'; timelineBtn.style.color = ''; }
                                                if (timelineContent) timelineContent.style.display = 'block';
                                                if (currentStudents.length === 0) loadStudents();
                                                setTimeout(() => {
                                                    const searchInput = document.getElementById('timelineSearch');
                                                    if (searchInput) searchInput.focus();
                                                }, 100);
                                                populateTimelineDropdown();
                                            } else if (tab === 'verify') {
                                                if (verifyBtn) { verifyBtn.className = 'btn'; verifyBtn.style.color = ''; }
                                                if (verifyContent) verifyContent.style.display = 'block';
                                                loadFees();
                                            } else if (tab === 'history') {
                                                if (historyBtn) { historyBtn.className = 'btn'; historyBtn.style.color = ''; }
                                                if (historyContent) historyContent.style.display = 'block';
                                                loadPaymentHistory();
                                            } else if (tab === 'pending') {
                                                if (pendingBtn) { pendingBtn.className = 'btn'; pendingBtn.style.color = ''; }
                                                if (pendingContent) pendingContent.style.display = 'block';
                                                if (typeof loadPendingFees === 'function') loadPendingFees();
                                            }
                                        };

                                        window.goToVerifyUploads = function (studentId) {
                                            const student = currentStudents.find(s => s._id === studentId);
                                            if (student) {
                                                switchFeeTab('verify');

                                                // 1. Search for the student's name
                                                const searchInput = document.getElementById('feeSearch');
                                                if (searchInput) {
                                                    searchInput.value = student.FullName || student.FirstName;
                                                }

                                                // 2. Set the dropdown filter to 'Pending'
                                                const statusDropdown = document.getElementById('filterFeeStatus'); // ADD THIS LINE
                                                if (statusDropdown) { statusDropdown.value = 'Pending'; }           // ADD THIS LINE

                                                // 3. Trigger the filter function
                                                filterFees();
                                            }
                                        };


                                        // Add Student Logic
                                        window.openAddStudentModal = function () {
                                            document.getElementById('addStudentForm').reset();
                                            document.getElementById('addJoiningDate').valueAsDate = new Date();
                                            document.getElementById('addStudentModal').style.display = 'flex';
                                        }

                                        window.closeAddStudentModal = function () {
                                            document.getElementById('addStudentModal').style.display = 'none';
                                        }

                                        window.submitAddStudent = async function (e) {
                                            e.preventDefault();
                                            const btn = e.target.querySelector('button[type="submit"]');
                                            const originalText = btn.innerHTML;
                                            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                                            btn.disabled = true;

                                            const payload = {
                                                FirstName: document.getElementById('addFirstName').value.trim(),
                                                LastName: document.getElementById('addLastName').value.trim(),
                                                Contact: document.getElementById('addContact').value.trim(),
                                                Email: document.getElementById('addEmail').value.trim(),
                                                LibraryID: document.getElementById('addLibraryID').value.trim(),
                                                AadharNumber: document.getElementById('addAadhar').value.trim() || undefined,
                                                JoiningDate: document.getElementById('addJoiningDate').value,
                                                SeatNo: document.getElementById('addSeatNo').value.trim(),
                                                planDuration: document.getElementById('addPlanDuration').value,
                                                batchType: document.getElementById('addBatchType').value,
                                                amount: Number(document.getElementById('addAmount').value),
                                                mustChangePassword: true
                                            };

                                            try {
                                                await apiFetch('/admin/students', {
                                                    method: 'POST',
                                                    body: JSON.stringify(payload)
                                                });
                                                showToast('Student successfully added!', 'success');
                                                closeAddStudentModal();
                                                loadStudents();
                                                loadDashboardStats();
                                            } catch (err) {
                                                showToast(err.message, 'error');
                                            } finally {
                                                btn.innerHTML = originalText;
                                                btn.disabled = false;
                                            }
                                        }

                                        // --- Global Notification Logs Logic ---
                                        let currentGlobalNotifications = [];
                                        let filteredGlobalNotifications = [];
                                        let globalNotificationsPage = 1;
                                        const globalNotificationsPerPage = 15;

                                        window.loadGlobalNotifications = async function () {
                                            const list = document.getElementById('globalNotificationList');
                                            if (!list) return;
                                            list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading global notifications...</td></tr>';

                                            try {
                                                const data = await apiFetch('/admin/notifications/global');
                                                if (data && data.length > 0) {
                                                    currentGlobalNotifications = data;
                                                    filterGlobalNotifications(true);
                                                } else {
                                                    list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No notifications sent yet.</td></tr>';
                                                    document.getElementById('globalNotificationPagination').innerHTML = '';
                                                }
                                            } catch (error) {
                                                list.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center; padding: 20px;">Error: ${error.message}</td></tr>`;
                                            }
                                        }

                                        window.filterGlobalNotifications = function (immediate = false) {
                                            const searchInput = document.getElementById('globalNotificationSearch');
                                            const query = searchInput ? searchInput.value.toLowerCase() : '';

                                            const executeFilter = () => {
                                                filteredGlobalNotifications = currentGlobalNotifications.filter(notif => {
                                                    const studentName = notif.StudentId ? (notif.StudentId.FullName || '').toLowerCase() : '';
                                                    const libId = notif.StudentId ? (notif.StudentId.LibraryID || '').toLowerCase() : '';
                                                    const title = (notif.Title || '').toLowerCase();
                                                    const message = (notif.Message || '').toLowerCase();

                                                    return studentName.includes(query) || libId.includes(query) || title.includes(query) || message.includes(query);
                                                });
                                                globalNotificationsPage = 1;
                                                renderGlobalNotifications();
                                            };

                                            if (immediate) executeFilter();
                                            else {
                                                if (window.globalNotifSearchTimeout) clearTimeout(window.globalNotifSearchTimeout);
                                                window.globalNotifSearchTimeout = setTimeout(executeFilter, 300);
                                            }
                                        }

                                        window.renderGlobalNotifications = function () {
                                            const list = document.getElementById('globalNotificationList');
                                            if (!list) return;

                                            const startIndex = (globalNotificationsPage - 1) * globalNotificationsPerPage;
                                            const endIndex = startIndex + globalNotificationsPerPage;
                                            const paginatedNotifs = filteredGlobalNotifications.slice(startIndex, endIndex);

                                            if (paginatedNotifs.length === 0) {
                                                list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No notifications match your search.</td></tr>';
                                                document.getElementById('globalNotificationPagination').innerHTML = '';
                                                return;
                                            }

                                            list.innerHTML = paginatedNotifs.map(notif => {
                                                const studentName = notif.StudentId ? notif.StudentId.FullName : '<em style="color:red;">Deleted User</em>';
                                                const libId = notif.StudentId ? (notif.StudentId.LibraryID || 'N/A') : 'N/A';
                                                const dateStr = new Date(notif.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ /g, ' ');

                                                let statusBadge = notif.IsRead
                                                    ? `<span style="font-size: 0.85em; color: var(--success-color); padding: 4px 8px; border: 1px solid currentColor; background: var(--bg-color); border-radius: 12px;"><i class="fa-solid fa-check-double"></i> Read</span>`
                                                    : `<span style="font-size: 0.85em; color: var(--text-secondary); padding: 4px 8px; border: 1px solid currentColor; background: var(--bg-color); border-radius: 12px;"><i class="fa-solid fa-check"></i> Delivered</span>`;

                                                return `
                                                    <tr style="border-bottom: 1px dashed var(--card-border); transition: background 0.2s;" onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='transparent'">
                                                        <td style="padding: 15px; color: var(--text-secondary); font-size: 0.9em;"><i class="fa-regular fa-clock" style="margin-right: 5px;"></i> ${dateStr}</td>
                                                        <td style="padding: 15px; font-weight: 500; color: var(--text-primary);">${studentName}</td>
                                                        <td style="padding: 15px; color: var(--primary-color); font-weight: 600;">${libId}</td>
                                                        <td style="padding: 15px; font-weight: 600;">${notif.Title || 'Alert'}</td>
                                                        <td style="padding: 15px; max-width: 300px; white-space: normal; color: var(--text-secondary); font-size: 0.9em;">${notif.Message}</td>
                                                        <td style="padding: 15px; text-align: center;">${statusBadge}</td>
                                                    </tr>
                                                `;
                                            }).join('');

                                            renderGlobalNotificationsPagination();
                                        }

                                        window.renderGlobalNotificationsPagination = function () {
                                            const pagination = document.getElementById('globalNotificationPagination');
                                            if (!pagination) return;

                                            const totalPages = Math.ceil(filteredGlobalNotifications.length / globalNotificationsPerPage);

                                            if (totalPages <= 1) {
                                                pagination.innerHTML = '';
                                                return;
                                            }

                                            let html = '';
                                            html += `<button onclick="changeGlobalNotificationsPage(${globalNotificationsPage - 1})" ${globalNotificationsPage === 1 ? 'disabled' : ''} class="btn-outline" style="padding: 5px 10px; border-radius: 6px;"><i class="fa-solid fa-chevron-left"></i></button>`;

                                            for (let i = 1; i <= totalPages; i++) {
                                                if (i === 1 || i === totalPages || (i >= globalNotificationsPage - 1 && i <= globalNotificationsPage + 1)) {
                                                    if (i === globalNotificationsPage) {
                                                        html += `<button class="btn" style="padding: 5px 10px; border-radius: 6px;">${i}</button>`;
                                                    } else {
                                                        html += `<button onclick="changeGlobalNotificationsPage(${i})" class="btn-outline" style="padding: 5px 10px; border-radius: 6px;">${i}</button>`;
                                                    }
                                                } else if (i === globalNotificationsPage - 2 || i === globalNotificationsPage + 2) {
                                                    html += `<span style="padding: 5px; color: var(--text-secondary);">...</span>`;
                                                }
                                            }

                                            html += `<button onclick="changeGlobalNotificationsPage(${globalNotificationsPage + 1})" ${globalNotificationsPage === totalPages ? 'disabled' : ''} class="btn-outline" style="padding: 5px 10px; border-radius: 6px;"><i class="fa-solid fa-chevron-right"></i></button>`;
                                            pagination.innerHTML = html;
                                        }

                                        window.changeGlobalNotificationsPage = function (page) {
                                            if (page < 1 || page > Math.ceil(filteredGlobalNotifications.length / globalNotificationsPerPage)) return;
                                            globalNotificationsPage = page;
                                        }

                                        // --- Data Export (CSV) Logic ---
                                        window.exportToCSV = function (filename, rows) {
                                            if (!rows || rows.length === 0) {
                                                showToast('No data available to export.', 'warning');
                                                return;
                                            }
                                            const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
                                            const encodedUri = encodeURI(csvContent);
                                            const link = document.createElement("a");
                                            link.setAttribute("href", encodedUri);
                                            link.setAttribute("download", filename);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                        }

                                        window.exportStudentsCSV = async function () {
    if (filteredStudents.length === 0) {
        showToast('No students matched current filter.', 'warning');
        return;
    }

    // ── Color palette ──────────────────────────────────────────────
    const DARK_NAVY  = "1A3557";
    const MID_BLUE   = "2563A8";
    const ROW_ODD    = "EBF2FB";
    const WHITE      = "FFFFFF";
    const TEXT_DARK  = "1E293B";
    const TEXT_GRAY  = "64748B";
    const BORDER_CLR = "CBD5E1";
    const SPACER_BG  = "F1F5F9";
    const SLATE_BG   = "F8FAFC";

    // Status badge colors
    const STATUS_COLORS = {
        active:    { bg: "DCFCE7", text: "166534" },
        inactive:  { bg: "FEE2E2", text: "991B1B" },
        expired:   { bg: "FEF3C7", text: "92400E" },
        default:   { bg: "F1F5F9", text: "475569" }
    };

    // ── Helpers ────────────────────────────────────────────────────
    const solidFill  = (rgb) => ({ type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rgb } });
    const thinBorder = (rgb = BORDER_CLR) => ({ style: "thin", color: { argb: "FF" + rgb } });
    const allBorders = (rgb = BORDER_CLR) => ({
        top: thinBorder(rgb), bottom: thinBorder(rgb),
        left: thinBorder(rgb), right: thinBorder(rgb)
    });
    const font = (opts) => ({ name: "Arial", ...opts });

    const getStatusColor = (status = "") => {
        const key = status.toLowerCase();
        return STATUS_COLORS[key] || STATUS_COLORS.default;
    };

    // ── Build data rows ────────────────────────────────────────────
    const rows = filteredStudents.map(s => [
        s.LibraryID || "N/A",
        (s.FullName || `${s.FirstName} ${s.LastName}`).replace(/,/g, ""),
        s.Contact      || "N/A",
        s.Email        || "N/A",
        s.Gender       || "N/A",
        s.AadharNumber || "N/A",
        s.AccountStatus|| "N/A",
        s.batchType    || "N/A",
        s.planDuration || "N/A",
        s.SeatNo       || "N/A",
        s.JoiningDate  ? new Date(s.JoiningDate).toLocaleDateString("en-IN") : "N/A"
    ]);

    const totalStudents = rows.length;
    const activeCount   = filteredStudents.filter(s => s.AccountStatus?.toLowerCase() === "active").length;
    const today = new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric"
    });

    const COLS     = 11;
    const colRange = `A1:K1`;

    // ── Workbook & sheet ───────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Knowledge Nook Library";
    wb.created = new Date();

    const ws = wb.addWorksheet("Students", {
        views: [{ showGridLines: false }],
        pageSetup: { fitToPage: true, fitToWidth: 1 }
    });

    // ── Column widths ──────────────────────────────────────────────
    ws.columns = [
        { width: 13 }, // Library ID
        { width: 24 }, // Name
        { width: 14 }, // Contact
        { width: 26 }, // Email
        { width: 10 }, // Gender
        { width: 16 }, // Aadhar No
        { width: 15 }, // Account Status
        { width: 14 }, // Batch
        { width: 12 }, // Plan
        { width: 10 }, // Seat No
        { width: 14 }, // Joining Date
    ];

    // ── Row 1: Title ───────────────────────────────────────────────
    const r1 = ws.addRow(["KNOWLEDGE NOOK LIBRARY"]);
    r1.height = 36;
    ws.mergeCells("A1:K1");
    const c1 = r1.getCell(1);
    c1.value     = "KNOWLEDGE NOOK LIBRARY";
    c1.font      = font({ bold: true, size: 18, color: { argb: "FF" + WHITE } });
    c1.fill      = solidFill(DARK_NAVY);
    c1.alignment = { horizontal: "center", vertical: "middle" };

    // ── Row 2: Subtitle ────────────────────────────────────────────
    const r2 = ws.addRow(["Student Directory Report"]);
    r2.height = 20;
    ws.mergeCells("A2:K2");
    const c2 = r2.getCell(1);
    c2.value     = "Student Directory Report";
    c2.font      = font({ italic: true, size: 11, color: { argb: "FFA0AEC0" } });
    c2.fill      = solidFill(DARK_NAVY);
    c2.alignment = { horizontal: "center", vertical: "middle" };

    // ── Row 3: Spacer ──────────────────────────────────────────────
    const r3 = ws.addRow([]);
    r3.height = 8;
    ws.mergeCells("A3:K3");
    r3.getCell(1).fill = solidFill(SPACER_BG);

    // ── Row 4: Summary Stats ───────────────────────────────────────
    // Box 1: Total Students (A4:D4)
    // Box 2: Active Students (E4:H4)
    // Box 3: Export Date (I4:K4)
    const r4 = ws.addRow([]);
    r4.height = 30;
    ws.mergeCells("A4:D4");
    ws.mergeCells("E4:H4");
    ws.mergeCells("I4:K4");

    const statsStyle = (bgRgb, textRgb, borderRgb) => ({
        fill:      solidFill(bgRgb),
        font:      font({ bold: true, size: 11, color: { argb: "FF" + textRgb } }),
        alignment: { horizontal: "center", vertical: "middle" },
        border:    allBorders(borderRgb)
    });

    const totalCell = r4.getCell(1);
    totalCell.value     = `👥  Total Students: ${totalStudents}`;
    totalCell.font      = font({ bold: true, size: 11, color: { argb: "FF1E3A5F" } });
    totalCell.fill      = solidFill("DBEAFE");
    totalCell.alignment = { horizontal: "center", vertical: "middle" };
    totalCell.border    = allBorders("93C5FD");

    const activeCell = r4.getCell(5);
    activeCell.value     = `✅  Active: ${activeCount}`;
    activeCell.font      = font({ bold: true, size: 11, color: { argb: "FF166534" } });
    activeCell.fill      = solidFill("DCFCE7");
    activeCell.alignment = { horizontal: "center", vertical: "middle" };
    activeCell.border    = allBorders("86EFAC");

    const dateCell = r4.getCell(9);
    dateCell.value     = `📅  ${today}`;
    dateCell.font      = font({ bold: true, size: 10, color: { argb: "FF92400E" } });
    dateCell.fill      = solidFill("FEF3C7");
    dateCell.alignment = { horizontal: "center", vertical: "middle" };
    dateCell.border    = allBorders("F59E0B");

    // ── Row 5: Spacer ──────────────────────────────────────────────
    const r5 = ws.addRow([]);
    r5.height = 8;
    ws.mergeCells("A5:K5");
    r5.getCell(1).fill = solidFill(SPACER_BG);

    // ── Row 6: Headers ─────────────────────────────────────────────
    const headers = ["Library ID","Name","Contact","Email","Gender","Aadhar No","Account Status","Batch","Plan","Seat No","Joining Date"];
    const r6 = ws.addRow(headers);
    r6.height = 26;
    r6.eachCell((cell) => {
        cell.font      = font({ bold: true, size: 10, color: { argb: "FF" + WHITE } });
        cell.fill      = solidFill(MID_BLUE);
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border    = allBorders(WHITE);
    });

    // ── Data Rows ──────────────────────────────────────────────────
    rows.forEach((row, i) => {
        const wr    = ws.addRow(row);
        wr.height   = 21;
        const bgClr = i % 2 === 0 ? ROW_ODD : WHITE;

        wr.eachCell({ includeEmpty: true }, (cell, colNum) => {
            const isStatus = colNum === 7;   // Account Status
            const isName   = colNum === 2;   // Name (left-align)
            const isEmail  = colNum === 4;   // Email (left-align)

            if (isStatus) {
                const sc = getStatusColor(cell.value);
                cell.font      = font({ bold: true, size: 10, color: { argb: "FF" + sc.text } });
                cell.fill      = solidFill(sc.bg);
            } else {
                cell.font      = font({ size: 10, color: { argb: "FF" + TEXT_DARK } });
                cell.fill      = solidFill(bgClr);
            }

            cell.alignment = {
                horizontal: (isName || isEmail) ? "left" : "center",
                vertical: "middle"
            };
            cell.border = allBorders(BORDER_CLR);
        });
    });

    // ── Footer ─────────────────────────────────────────────────────
    const footerRowNum = 7 + rows.length;
    const rf = ws.addRow([`Generated on ${today}  •  Knowledge Nook Library  •  Total ${totalStudents} students`]);
    rf.height = 16;
    ws.mergeCells(`A${footerRowNum}:K${footerRowNum}`);
    const fc = rf.getCell(1);
    fc.value     = `Generated on ${today}  •  Knowledge Nook Library  •  Total ${totalStudents} students`;
    fc.font      = font({ italic: true, size: 9, color: { argb: "FF" + TEXT_GRAY } });
    fc.fill      = solidFill(SLATE_BG);
    fc.alignment = { horizontal: "right", vertical: "middle" };
    fc.border    = { top: thinBorder(BORDER_CLR) };

    // ── Download ───────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    saveAs(blob, `Students_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
};

                                
                                       

                                        window.exportPaymentHistoryCSV = async function () {
    if (filteredPaymentHistory.length === 0) {
        showToast('No payment history matched current filter.', 'warning');
        return;
    }

    // ── Color palette ──────────────────────────────────────────────
    const DARK_NAVY  = "1A3557";
    const MID_BLUE   = "2563A8";
    const LIGHT_GOLD = "FEF3C7";
    const GOLD_BDR   = "F59E0B";
    const ROW_ODD    = "EBF2FB";
    const WHITE      = "FFFFFF";
    const TEXT_DARK  = "1E293B";
    const TEXT_GRAY  = "64748B";
    const BORDER_CLR = "CBD5E1";
    const GREEN_TEXT = "166534";
    const GREEN_BG   = "DCFCE7";
    const SPACER_BG  = "F1F5F9";
    const SLATE_BG   = "F8FAFC";

    // ── Helpers ────────────────────────────────────────────────────
    const solidFill  = (rgb) => ({ type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rgb } });
    const thinBorder = (rgb = BORDER_CLR) => ({ style: "thin", color: { argb: "FF" + rgb } });
    const allBorders = (rgb = BORDER_CLR) => ({
        top: thinBorder(rgb), bottom: thinBorder(rgb),
        left: thinBorder(rgb), right: thinBorder(rgb)
    });
    const font = (opts) => ({ name: "Arial", ...opts });

    // ── Build data rows ────────────────────────────────────────────
    let totalAmount = 0;
    const rows = filteredPaymentHistory.map(fee => {
        let txnId = "N/A", actDate = "N/A";
        if (fee.AdminNote) {
            const parts = fee.AdminNote.split("|");
            txnId   = parts.length >= 2 ? parts[0].replace(/Txn ID:/i, "").trim() : fee.AdminNote;
            actDate = parts.length >= 2 ? parts[1].replace(/Date:/i,   "").trim() : "N/A";
        }
        const amount = Number(fee.Amount) || 0;
        totalAmount += amount;
        return [
            fee.ReceiptNo                     || "N/A",
            fee.StudentId?.LibraryID          || "N/A",
            fee.StudentId?.FullName           || "Deleted Student",
            fee.Month                         || "N/A",
            amount,
            fee.Batch || fee.StudentId?.batchType || "N/A",
            fee.StudentId?.planDuration       || "N/A",
            actDate,
            txnId,
            fee.Status                        || "N/A"
        ];
    });

    const today = new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric"
    });

    // ── Workbook & sheet ───────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Knowledge Nook Library";
    wb.created = new Date();

    const ws = wb.addWorksheet("Payments", {
        views: [{ showGridLines: false }],
        pageSetup: { fitToPage: true, fitToWidth: 1 }
    });

    // ── Column widths ──────────────────────────────────────────────
    ws.columns = [
        { width: 13 }, { width: 14 }, { width: 24 }, { width: 14 },
        { width: 14 }, { width: 15 }, { width: 12 }, { width: 15 },
        { width: 26 }, { width: 11 }
    ];

    // ── Row 1: Library Title ───────────────────────────────────────
    const r1 = ws.addRow(["KNOWLEDGE NOOK LIBRARY"]);
    r1.height = 36;
    ws.mergeCells("A1:J1");
    const c1 = r1.getCell(1);
    c1.value     = "KNOWLEDGE NOOK LIBRARY";
    c1.font      = font({ bold: true, size: 18, color: { argb: "FF" + WHITE } });
    c1.fill      = solidFill(DARK_NAVY);
    c1.alignment = { horizontal: "center", vertical: "middle" };

    // ── Row 2: Subtitle ────────────────────────────────────────────
    const r2 = ws.addRow(["Payment History Report"]);
    r2.height = 20;
    ws.mergeCells("A2:J2");
    const c2 = r2.getCell(1);
    c2.value     = "Payment History Report";
    c2.font      = font({ italic: true, size: 11, color: { argb: "FFA0AEC0" } });
    c2.fill      = solidFill(DARK_NAVY);
    c2.alignment = { horizontal: "center", vertical: "middle" };

    // ── Row 3: Spacer ──────────────────────────────────────────────
    const r3 = ws.addRow([]);
    r3.height = 8;
    ws.mergeCells("A3:J3");
    r3.getCell(1).fill = solidFill(SPACER_BG);

    // ── Row 4: Total Collection ────────────────────────────────────
    const r4 = ws.addRow(["💰  Total Collection (₹)", "", "", "", "", totalAmount]);
    r4.height = 30;
    ws.mergeCells("A4:E4");
    ws.mergeCells("F4:J4");

    const labelCell = r4.getCell(1);
    labelCell.value     = "💰  Total Collection (₹)";
    labelCell.font      = font({ bold: true, size: 12, color: { argb: "FF92400E" } });
    labelCell.fill      = solidFill(LIGHT_GOLD);
    labelCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    labelCell.border    = allBorders(GOLD_BDR);

    const totalCell = r4.getCell(6);
    totalCell.value          = totalAmount;
    totalCell.numFmt         = '₹#,##0';
    totalCell.font           = font({ bold: true, size: 14, color: { argb: "FF92400E" } });
    totalCell.fill           = solidFill(LIGHT_GOLD);
    totalCell.alignment      = { horizontal: "right", vertical: "middle", indent: 1 };
    totalCell.border         = allBorders(GOLD_BDR);

    // ── Row 5: Spacer ──────────────────────────────────────────────
    const r5 = ws.addRow([]);
    r5.height = 8;
    ws.mergeCells("A5:J5");
    r5.getCell(1).fill = solidFill(SPACER_BG);

    // ── Row 6: Headers ─────────────────────────────────────────────
    const headers = ["Receipt No","Library ID","Student Name","Month","Amount (₹)","Batch","Plan","Payment Date","Transaction ID","Status"];
    const r6 = ws.addRow(headers);
    r6.height = 26;
    r6.eachCell((cell) => {
        cell.font      = font({ bold: true, size: 10, color: { argb: "FF" + WHITE } });
        cell.fill      = solidFill(MID_BLUE);
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border    = allBorders(WHITE);
    });

    // ── Data Rows ──────────────────────────────────────────────────
    rows.forEach((row, i) => {
        const wr = ws.addRow(row);
        wr.height = 21;
        const bgClr = i % 2 === 0 ? ROW_ODD : WHITE;

        wr.eachCell({ includeEmpty: true }, (cell, colNum) => {
            const isStatus = colNum === 10;
            const isAmount = colNum === 5;
            const isName   = colNum === 3;

            cell.font      = isStatus
                ? font({ bold: true, size: 10, color: { argb: "FF" + GREEN_TEXT } })
                : font({ size: 10, color: { argb: "FF" + TEXT_DARK } });
            cell.fill      = solidFill(isStatus ? GREEN_BG : bgClr);
            cell.alignment = { horizontal: isName ? "left" : "center", vertical: "middle" };
            cell.border    = allBorders(BORDER_CLR);

            if (isAmount) cell.numFmt = "₹#,##0";
        });
    });

    // ── Footer ─────────────────────────────────────────────────────
    const footerRowNum = 7 + rows.length;
    const rf = ws.addRow([`Generated on ${today}  •  Knowledge Nook Library`]);
    rf.height = 16;
    ws.mergeCells(`A${footerRowNum}:J${footerRowNum}`);
    const fc = rf.getCell(1);
    fc.value     = `Generated on ${today}  •  Knowledge Nook Library`;
    fc.font      = font({ italic: true, size: 9, color: { argb: "FF" + TEXT_GRAY } });
    fc.fill      = solidFill(SLATE_BG);
    fc.alignment = { horizontal: "right", vertical: "middle" };
    fc.border    = { top: thinBorder(BORDER_CLR) };

    // ── Download ───────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    saveAs(blob, `Payment_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
};