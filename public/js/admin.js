// Auth Check
if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'admin') {
    window.location.href = '/';
}

let currentStudents = [];
let filteredStudents = [];
let currentStudentsPage = 1;
const studentsPerPage = 10;
let searchTimeout = null;

let currentFees = [];
let filteredFees = [];
let currentFeesPage = 1;
const feesPerPage = 10;

let currentIssues = [];
let filteredIssues = [];
let currentIssuesPage = 1;
const issuesPerPage = 10;

async function loadDashboardStats() {
 
    try {
        const stats = await apiFetch('/admin/dashboard-stats');
        document.getElementById('stat-total-students').textContent = stats.totalStudents || 0;
        document.getElementById('stat-active-students').textContent = stats.activeStudents || 0;
        document.getElementById('stat-inactive-students').textContent = stats.inactiveStudents || 0;
        document.getElementById('stat-pending-students').textContent = stats.pendingStudents || 0;
        document.getElementById('stat-pending-fees').textContent = stats.pendingFees || 0;
        document.getElementById('stat-open-issues').textContent = stats.openIssues || 0;
        document.getElementById('stat-pending-requests').textContent = stats.pendingProfileRequests || 0;
        document.getElementById('stat-pending-leads').textContent = stats.pendingLeads || 0;
        
        // Format revenue as currency
        document.getElementById('stat-total-revenue').textContent = '₹' + (stats.totalRevenue || 0).toLocaleString('en-IN');

        // Distribution Stats (Batch & Plan)
        const distContainer = document.getElementById('distribution-stats-container');
        if (stats.distribution && stats.distribution.length > 0) {
            distContainer.innerHTML = stats.distribution.map(d => `
                <div style="border: 1px solid var(--card-border); border-radius: 8px; overflow: hidden; background: var(--card-bg);">
                    <div style="background: var(--bg-color); padding: 12px 15px; border-bottom: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: var(--primary-color); font-size: 1.05em;">${d.batch}</strong>
                        <span style="font-size: 0.8em; background: var(--primary-light); color: var(--primary-color); padding: 2px 8px; border-radius: 10px; font-weight: 600;">Total: ${d.total}</span>
                    </div>
                    <div style="padding: 12px 15px;">
                        ${d.plans.map(p => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--card-border);">
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
            genderContainer.innerHTML = stats.genderStats.map(g => `
                <div style="flex: 1; border: 1px solid var(--card-border); padding: 15px; border-radius: 8px; text-align: center; background: var(--card-bg); min-width: 120px;">
                    <div style="font-size: 1.5em; font-weight: bold; color: var(--text-primary);">${g.count}</div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">${g._id || 'Not Specified'}</div>
                </div>
            `).join('');
        } else {
            genderContainer.innerHTML = '<p style="width: 100%; text-align: center; color: var(--text-secondary);">No gender data available.</p>';
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
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

            return matchesQuery && matchesStatus;
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
    if (dropdown) {
        dropdown.value = 'Active';
        if (currentStudents.length > 0) {
            filterStudents(true);
        }
    }
}

function showInactiveStudents() {
    window.location.hash = '#students';
    const dropdown = document.getElementById('filterStudentStatus');
    if (dropdown) {
        dropdown.value = 'Inactive';
        if (currentStudents.length > 0) {
            filterStudents(true);
        }
    }
}

function showPendingApprovals() {
    window.location.hash = '#students';
    // Set the dropdown to Pending. When loadStudents() runs (triggered by hash change),
    // it will call filterStudents(), which will read this value.
    const dropdown = document.getElementById('filterStudentStatus');
    if (dropdown) {
        dropdown.value = 'Pending';
        // If we were already on the students page, force a re-filter
        if (currentStudents.length > 0) {
            filterStudents(true);
        }
    }
}

function renderStudents() {
    const list = document.getElementById('studentsList');
    const startIndex = (currentStudentsPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

    list.innerHTML = paginatedStudents.map(student => `
        <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${student.ProfilePictureURL || '/img/default-avatar.png'}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--card-border); ${student.ProfilePictureURL ? 'cursor: pointer;' : ''}" ${student.ProfilePictureURL ? `onclick="window.open('${student.ProfilePictureURL}', '_blank')"` : ''} title="View Profile Picture">
                    <strong>${student.FullName || student.FirstName + ' ' + (student.LastName || '')}</strong>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select onchange="updateStudentStatus('${student._id}', this.value)" style="padding: 5px; border-radius: 6px; border: 1px solid var(--input-border); background: var(--bg-color); font-size: 0.85em; font-weight: 500; cursor: pointer;">
                        <option value="Pending" ${student.AccountStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Active" ${student.AccountStatus === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${student.AccountStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>

                    <!-- Aadhar Verification Controls -->
                    <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px; padding-left: 10px; border-left: 1px solid var(--card-border);">
                        ${student.AadharProofURL ? 
                            `<button onclick="window.open('${student.AadharProofURL}', '_blank')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #6B7280; color: #6B7280; border-radius: 4px; font-size: 0.85em;" title="View Aadhar"><i class="fa-solid fa-address-card"></i></button>` 
                            : ''
                        }
                        
                        ${(student.AadharStatus === 'Pending' || student.AadharStatus === 'Not Uploaded' && student.AadharProofURL) ? 
                            `<button onclick="verifyAadhar('${student._id}', 'Verified')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #059669; color: #059669; border-radius: 4px; font-size: 0.85em;" title="Approve Aadhar"><i class="fa-solid fa-check"></i></button>
                             <button onclick="rejectAadhar('${student._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #DC2626; color: #DC2626; border-radius: 4px; font-size: 0.85em;" title="Reject Aadhar"><i class="fa-solid fa-xmark"></i></button>` 
                            : ''
                        }

                        ${student.AadharStatus === 'Verified' ? 
                            `<span style="font-size: 0.8em; color: #059669; display: flex; align-items: center; gap: 4px;" title="Aadhar Verified"><i class="fa-solid fa-shield-check"></i> Verified</span>` : ''}
                        
                        ${student.AadharStatus === 'Rejected' ? 
                            `<span style="font-size: 0.8em; color: #DC2626; display: flex; align-items: center; gap: 4px;" title="Rejected: ${student.AadharRejectionReason || 'Invalid'}"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>` : ''}
                        
                        ${(!student.AadharProofURL) ? 
                            `<span style="font-size: 0.8em; color: #ef4444; display: flex; align-items: center; gap: 4px;" title="Proof not uploaded"><i class="fa-solid fa-circle-exclamation"></i> Upload Pending</span>` : ''}
                    </div>

                    <button onclick="viewStudent('${student._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: var(--primary-color); color: var(--primary-color); border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-eye"></i> View</button>
                </div>
            </div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">
                <i class="fa-solid fa-id-badge"></i> ID: ${student.LibraryID || 'Not Assigned'} | <i class="fa-solid fa-envelope"></i> ${student.Email || 'N/A'} | <i class="fa-solid fa-phone"></i> ${student.Contact}
            </div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 15px;">
                <i class="fa-solid fa-chair"></i> Seat: ${student.SeatNo || 'Unassigned'} | Plan: ${student.planDuration || 'N/A'} (${student.batchType || 'N/A'} - ₹${student.amount || 0})
            </div>
        </div>
    `).join('');

    renderStudentsPagination();
}

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

async function loadInterestedStudents() {
    const list = document.getElementById('interestedList');
    list.innerHTML = 'Loading interested students...';
    try {
        const data = await apiFetch('/admin/interested-students');
        if (data && data.length > 0) {
            list.innerHTML = data.map(student => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--card-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <strong style="font-size: 1.1em;">${student.Name}</strong>
                            <span style="font-size: 0.85em; margin-left: 10px; padding: 3px 8px; border-radius: 12px; background: ${student.Status === 'Reviewed' ? '#DEF7EC' : '#FEF3C7'}; color: ${student.Status === 'Reviewed' ? '#03543F' : '#92400E'}">${student.Status}</span>
                        </div>
                        <div style="font-size: 0.85em; color: var(--text-light);">
                            ${new Date(student.SubmittedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
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
                        ${student.Status === 'Pending' ? `<button onclick="reviewInterestedStudent('${student._id}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85em; background: #22C55E;">Mark Reviewed</button>` : ''}
                        ${student.Status === 'Reviewed' ? `<button onclick="promptConvertStudent('${student._id}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85em;">Create Account</button>` : ''}
                        <button onclick="rejectInterestedStudent('${student._id}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85em; background: #EF4444;">Reject</button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No interested students found.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function reviewInterestedStudent(id) {
    if (!await showConfirm('Mark this student as reviewed?')) return;
    try {
        await apiFetch(`/admin/interested-students/${id}/review`, { method: 'PUT' });
        showToast('Student marked as reviewed successfully', 'success');
        loadInterestedStudents();
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
        loadStudents();
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
        loadStudents();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function viewStudent(id) {
    const student = currentStudents.find(s => s._id === id);
    if (!student) return;

    const modal = document.getElementById('studentModal');
    const content = document.getElementById('studentModalContent');

    content.innerHTML = `
        <div class="form-group">
            <label>Library ID</label>
            <input type="text" id="modalLibraryID" value="${student.LibraryID || ''}">
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
            <label>Email</label>
            <input type="email" id="modalEmail" value="${student.Email || ''}">
        </div>
        <div class="form-group">
            <label>Contact</label>
            <input type="text" id="modalContact" value="${student.Contact || ''}" required>
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
            <label>Aadhar Number</label>
            <input type="text" id="modalAadhar" value="${student.AadharNumber || ''}">
        </div>
        <div class="form-group">
            <label>Father's Name</label>
            <input type="text" id="modalFatherName" value="${student.FatherName || ''}">
        </div>
        <div class="form-group">
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
        <div class="form-group">
            <label>Account Status</label>
            <select id="modalStatus">
                <option value="Pending" ${student.AccountStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Active" ${student.AccountStatus === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${student.AccountStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
        </div>
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
            <label>Calculated Amount (₹)</label>
            <input type="number" id="modalAmount" value="${student.amount || ''}" placeholder="E.g., 1000">
        </div>
    `;

    document.getElementById('modalStudentId').value = student._id;
    modal.style.display = 'block';
}

function closeStudentModal() {
    document.getElementById('studentModal').style.display = 'none';
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
                        <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: ${fee.Status === 'Approved' || fee.Status === 'Paid' ? '#DEF7EC' : (fee.Status === 'Pending' ? '#FEF3C7' : '#FDE8E8')}; color: ${fee.Status === 'Approved' || fee.Status === 'Paid' ? '#03543F' : (fee.Status === 'Pending' ? '#92400E' : '#9B1C1C')}">
                            ${fee.Status}
                        </span>
                    </div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">
                    Month: ${fee.Month || 'N/A'} | 
                    Batch: ${
                        fee.Batch || 
                        (fee.StudentId 
                            ? `${fee.StudentId.planDuration || 'N/A'} (${fee.StudentId.batchType || 'N/A'})`
                            : 'N/A'
                        )
                    } | 
                    Amount: ₹${fee.Amount || 0}
                    </div>
                    <div style="margin-bottom: 15px;">
                        <a href="${fee.ProofImageURL}" target="_blank" style="font-size: 0.85em; color: var(--primary-color);">
                            <i class="fa-solid fa-image"></i> View Receipt Image
                        </a>
                    </div>

                        ${fee.Status === 'Rejected' && fee.AdminNote ? `
                        <div style="margin-top:8px; margin-bottom:10px;">
                            <span style="display:inline-block; padding:6px 12px; background:#FEE2E2; border-radius:8px; font-size:0.85em; color:#991B1B;">
                                <strong>Reason:</strong> ${fee.AdminNote}
                            </span>
                        </div>
                        ` : ''}




                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label for="feeStatus-${fee._id}" style="font-size: 0.85em; font-weight: 600;">Status:</label>
                        <select id="feeStatus-${fee._id}" onchange="updateFeeStatus('${fee._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); cursor: pointer;" ${fee.Status === 'Paid' || fee.Status === 'Rejected' ? 'disabled' : ''}>
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
    } catch (error) {
        showToast('Error updating fee status: ' + error.message, 'error');
        loadFees();
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

        alert("Remark updated");
        showToast("Remark updated", "success");

        loadFees();

    } catch (err) {

        alert("Error updating remark");
        showToast("Error updating remark", "error");

    }

}

async function loadRequests() {
    const list = document.getElementById('requestsList');
    list.innerHTML = 'Loading requests...';
    try {
        const data = await apiFetch('/admin/profile-requests');
        if (data && data.length > 0) {
            list.innerHTML = data.map(req => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <strong>Request from: ${req.StudentId ? `${req.StudentId.FullName} (ID: ${req.StudentId.LibraryID || 'N/A'})` : 'Unknown'}</strong>
                        <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: ${req.Status === 'Under Review' ? '#DBEAFE' : '#FEF3C7'}; color: ${req.Status === 'Under Review' ? '#1E40AF' : '#92400E'};">
                            ${req.Status}
                        </span>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.02); padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--card-border);">
                        <h5 style="margin-bottom:8px; color:var(--text-secondary);">Requested Changes:</h5>
                        ${Object.entries(req.ProposedData).map(([key, val]) => `
                            <div style="display:grid; grid-template-columns: 120px 1fr; gap:10px; font-size:0.9em; margin-bottom:4px;">
                                <span style="font-weight:600; color:var(--text-primary);">${key}:</span>
                                <span style="color:var(--text-secondary);">${val || '<em style="opacity: 0.5;">(empty)</em>'}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-end;">
                        <label style="font-size:0.9em;">Action:</label>
                        <select onchange="handleRequestAction('${req._id}', this.value)" style="padding: 6px; border-radius: 6px; border: 1px solid var(--card-border); background:var(--card-bg); color:var(--text-primary);">
                            <option value="" disabled selected>Select Action...</option>
                            <option value="Under Review">Mark as Under Review</option>
                            <option value="Approve" style="color: green; font-weight:bold;">Approve & Apply</option>
                            <option value="Reject" style="color: red; font-weight:bold;">Reject</option>
                        </select>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No active profile requests.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function handleRequestAction(id, action) {
    if (!action) return;

    if (action === 'Approve') {
        await approveRequest(id);
    } else if (action === 'Reject') {
        await rejectRequest(id);
    } else if (action === 'Under Review') {
        try {
            await apiFetch(`/admin/profile-requests/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ Status: 'Under Review' })
            });
            loadRequests();
        } catch (error) { showToast(error.message, 'error'); }
    }
}

async function approveRequest(id) {
    if (!await showConfirm('Approve this profile update?')) return;
    try {
        await apiFetch('/admin/profile-requests/' + id + '/approve', { method: 'PUT' });
        loadRequests();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function rejectRequest(id) {
    const reason = await showPrompt("Please provide a reason for rejecting this request (optional, will be shown to the student).");
    if (reason === null) return; // User clicked cancel

    try {
        await apiFetch('/admin/profile-requests/' + id + '/reject', {
            method: 'PUT',
            body: JSON.stringify({
                reason: reason || 'No reason provided.'
            })
        });
        loadRequests();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Announcements Logic
async function loadAnnouncements() {
    const list = document.getElementById('announcementsList');
    list.innerHTML = 'Loading announcements...';
    try {
        const data = await apiFetch('/announcements');
        if (data && data.length > 0) {
            list.innerHTML = data.map(ann => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <div style="font-size: 1.1em; font-weight: 600; color: var(--primary-color);">${ann.Title}</div>
                        <button onclick="deleteAnnouncement('${ann._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #ef4444; color: #ef4444; border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 10px;">Posted ${new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} at ${new Date(ann.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                    <div style="white-space: pre-wrap;">${ann.Message}</div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No previous announcements.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
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

        await apiFetch('/announcements', {
            method: 'POST',
            body: JSON.stringify({ Title: title, Message: content })
        });

        document.getElementById('announcementTitle').value = '';
        document.getElementById('announcementContent').value = '';
        showToast('Announcement posted successfully!', 'success');
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
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 15px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <div style="font-size: 1.1em; font-weight: 600; color: var(--primary-color);">${issue.IssueTitle}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px;">${issue.StudentId ? `${issue.StudentId.FullName} (ID: ${issue.StudentId.LibraryID || 'N/A'})` : 'Unknown'} | Contact: ${issue.StudentId ? issue.StudentId.Contact : 'N/A'} | Seat: ${issue.StudentId ? issue.StudentId.SeatNo : 'N/A'}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary);">${new Date(issue.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} <span style="margin:0 5px; opacity:0.6">|</span> ${new Date(issue.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: ${issue.Status === 'Resolved' ? '#DEF7EC' : (issue.Status === 'Pending' ? '#FDE8E8' : '#FEF3C7')}; color: ${issue.Status === 'Resolved' ? '#03543F' : (issue.Status === 'Pending' ? '#9B1C1C' : '#92400E')}">
                                ${issue.Status}
                            </span>
                            ${issue.Status === 'Resolved' ? `<button onclick="deleteIssue('${issue._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #ef4444; color: #ef4444; border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
                        </div>
                    </div>
                    <div style="margin-bottom: 15px; font-size: 0.95em; white-space: pre-wrap;">${issue.Description}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label for="status-${issue._id}" style="font-size: 0.85em; font-weight: 600;">Status:</label>
                        <select id="status-${issue._id}" onchange="updateIssueStatus('${issue._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); cursor: pointer;" ${issue.Status === 'Resolved' ? 'disabled' : ''}>
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
    } catch (error) {
        showToast('Error updating status: ' + error.message, 'error');
        loadIssues(); // reload to revert a failed change
    }
}

async function deleteIssue(id) {
    if (!await showConfirm('Are you sure you want to delete this resolved issue?')) return;
    try {
        await apiFetch('/issues/' + id, { method: 'DELETE' });
        loadIssues();
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
                <p id="customModalMessage"></p>
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

function showPrompt(message, isPrompt = true) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        const inputContainer = document.getElementById('customModalInputContainer');
        const input = document.getElementById('customModalInput');
        
        document.getElementById('customModalTitle').textContent = isPrompt ? 'Input Required' : 'Confirm';
        document.getElementById('customModalMessage').textContent = message;
        inputContainer.style.display = isPrompt ? 'block' : 'none';
        input.value = '';

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
