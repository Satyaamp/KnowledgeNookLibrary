// Auth Check
if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'admin') {
    window.location.href = '/';
}

let currentStudents = [];
let currentStudentsPage = 1;
const studentsPerPage = 10;

async function loadDashboardStats() {
    try {
        const stats = await apiFetch('/admin/dashboard-stats');
        document.getElementById('stat-total-students').textContent = stats.totalStudents || 0;
        document.getElementById('stat-pending-students').textContent = stats.pendingStudents || 0;
        document.getElementById('stat-pending-fees').textContent = stats.pendingFees || 0;
        document.getElementById('stat-open-issues').textContent = stats.openIssues || 0;
        document.getElementById('stat-pending-requests').textContent = stats.pendingProfileRequests || 0;
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
            renderStudents();
        } else {
            list.innerHTML = '<p>No students found.</p>';
            document.getElementById('studentsPagination').innerHTML = '';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderStudents() {
    const list = document.getElementById('studentsList');
    const startIndex = (currentStudentsPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const paginatedStudents = currentStudents.slice(startIndex, endIndex);

    list.innerHTML = paginatedStudents.map(student => `
        <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>${student.FullName || student.FirstName + ' ' + (student.LastName || '')}</strong>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: ${student.AccountStatus === 'Active' || student.AccountStatus === 'Approved' ? '#DEF7EC' : (student.AccountStatus === 'Pending' ? '#FEF3C7' : '#FDE8E8')}; color: ${student.AccountStatus === 'Active' || student.AccountStatus === 'Approved' ? '#03543F' : (student.AccountStatus === 'Pending' ? '#92400E' : '#9B1C1C')}">
                        ${student.AccountStatus || 'Pending'}
                    </span>
                    <button onclick="viewStudent('${student._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: var(--primary-color); color: var(--primary-color); border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-eye"></i> View</button>
                </div>
            </div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">
                <i class="fa-solid fa-id-badge"></i> ID: ${student.LibraryID || 'Not Assigned'} | <i class="fa-solid fa-envelope"></i> ${student.Email || 'N/A'} | <i class="fa-solid fa-phone"></i> ${student.Contact}
            </div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 15px;">
                <i class="fa-solid fa-chair"></i> Seat: ${student.SeatNo || 'Unassigned'} | Plan: ${student.planDuration || 'N/A'} (${student.batchType || 'N/A'} - ₹${student.amount || 0})
            </div>
            ${student.AccountStatus !== 'Active' ? `
            <div style="display: flex; gap: 10px;">
                <button onclick="approveStudent('${student._id}')" class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.85em;">Approve Account</button>
            </div>
            ` : ''}
        </div>
    `).join('');

    renderStudentsPagination();
}

function renderStudentsPagination() {
    const pagination = document.getElementById('studentsPagination');
    const totalPages = Math.ceil(currentStudents.length / studentsPerPage);

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
    if (page < 1 || page > Math.ceil(currentStudents.length / studentsPerPage)) return;
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
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <strong style="font-size: 1.1em;">${student.Name}</strong>
                            <span style="font-size: 0.85em; margin-left: 10px; padding: 3px 8px; border-radius: 12px; background: ${student.Status === 'Reviewed' ? '#DEF7EC' : '#FEF3C7'}; color: ${student.Status === 'Reviewed' ? '#03543F' : '#92400E'}">${student.Status}</span>
                        </div>
                        <div style="font-size: 0.85em; color: var(--text-light);">
                            ${new Date(student.SubmittedDate).toLocaleDateString()}
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
    if (!confirm('Mark this student as reviewed?')) return;
    try {
        await apiFetch(`/admin/interested-students/${id}/review`, { method: 'PUT' });
        alert('Student marked as reviewed successfully');
        loadInterestedStudents();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function rejectInterestedStudent(id) {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return; // User cancelled

    try {
        await apiFetch(`/admin/interested-students/${id}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Reason: reason || 'Not specified' })
        });
        alert('Application rejected');
        loadInterestedStudents();
    } catch (error) {
        alert('Error: ' + error.message);
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

async function approveStudent(id) {
    if (!confirm('Are you sure you want to approve this student account?')) return;
    try {
        await apiFetch('/admin/students/' + id, {
            method: 'PUT',
            body: JSON.stringify({ AccountStatus: 'Active' })
        });
        loadStudents();
    } catch (error) {
        alert('Error approving student: ' + error.message);
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
                <option value="Suspended" ${student.AccountStatus === 'Suspended' ? 'selected' : ''}>Suspended</option>
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

        alert('Student profile updated successfully!');
        closeStudentModal();
        loadStudents(); // Refresh the list
    } catch (error) {
        alert('Error updating student: ' + error.message);
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
            list.innerHTML = data.map(fee => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${fee.StudentId ? `${fee.StudentId.FullName} (ID: ${fee.StudentId.LibraryID || 'N/A'})` : 'Unknown Student'}</strong>
                        <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: ${fee.Status === 'Approved' || fee.Status === 'Paid' ? '#DEF7EC' : (fee.Status === 'Pending' ? '#FEF3C7' : '#FDE8E8')}; color: ${fee.Status === 'Approved' || fee.Status === 'Paid' ? '#03543F' : (fee.Status === 'Pending' ? '#92400E' : '#9B1C1C')}">
                            ${fee.Status}
                        </span>
                    </div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">
                        Month: ${fee.Month} | Amount: ₹${fee.Amount}
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
                        <label for="feeStatus-${fee._id}" style="font-size: 0.85em; font-weight: 600;">Update Status:</label>
                        <select id="feeStatus-${fee._id}" onchange="updateFeeStatus('${fee._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); cursor: pointer;" ${fee.Status === 'Paid' || fee.Status === 'Rejected' ? 'disabled' : ''}>
                            <option value="Pending" ${fee.Status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Paid" ${fee.Status === 'Paid' ? 'selected' : ''}>Paid</option>
                            <option value="Rejected" ${fee.Status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No fee records found.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function updateFeeStatus(id, newStatus) {
    let payload = { Status: newStatus };

    if (newStatus === 'Rejected') {
        const note = prompt('Please enter a reason for rejection (Admin Note):');
        if (note === null) {
            // User cancelled the prompt, revert the dropdown
            loadFees();
            return;
        }
        if (!note.trim()) {
            alert('A rejection reason is required.');
            loadFees();
            return;
        }
        payload.AdminNote = note.trim();
    } else {
        if (!confirm(`Are you sure you want to mark this payment as ${newStatus}?`)) {
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
        alert('Error updating fee status: ' + error.message);
        loadFees();
    }
}

async function updateRemark(id) {

    const note = document.getElementById(`note-${id}`).value.trim();

    if (!note) {
        alert("Remark cannot be empty");
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

        loadFees();

    } catch (err) {

        alert("Error updating remark");

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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>Request from: ${req.StudentId ? req.StudentId.FullName : 'Unknown'}</strong>
                        <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: #FEF3C7; color: #92400E;">
                            Pending Review
                        </span>
                    </div>
                    <div style="font-size: 0.9em; margin-bottom: 15px;">
                        <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px;">${JSON.stringify(req.ProposedData, null, 2)}</pre>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="approveRequest('${req._id}')" class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.85em;">Approve</button>
                        <button onclick="rejectRequest('${req._id}')" class="btn-outline" style="padding: 0.3rem 0.8rem; font-size: 0.85em; color: #9B1C1C; border-color: #9B1C1C;">Reject</button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No pending profile requests.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function approveRequest(id) {
    if (!confirm('Approve this profile update?')) return;
    try {
        await apiFetch('/admin/profile-requests/' + id + '/approve', { method: 'PUT' });
        loadRequests();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function rejectRequest(id) {
    if (!confirm('Reject this profile update?')) return;
    try {
        await apiFetch('/admin/profile-requests/' + id + '/reject', { method: 'PUT' });
        loadRequests();
    } catch (error) {
        alert('Error: ' + error.message);
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
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 10px;">Posted ${new Date(ann.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
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
        alert('Announcement posted successfully!');
        loadAnnouncements();
    } catch (error) {
        alert('Error posting announcement: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
        await apiFetch('/announcements/' + id, { method: 'DELETE' });
        loadAnnouncements();
    } catch (error) {
        alert('Error deleting announcement: ' + error.message);
    }
}

// Issues Logic
async function loadIssues() {
    const list = document.getElementById('issuesList');
    list.innerHTML = 'Loading issues...';
    try {
        const data = await apiFetch('/issues');
        if (data && data.length > 0) {
            list.innerHTML = data.map(issue => `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 15px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <div style="font-size: 1.1em; font-weight: 600; color: var(--primary-color);">${issue.IssueTitle}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px;">Reported by: ${issue.StudentId ? `${issue.StudentId.FullName} (ID: ${issue.StudentId.LibraryID || 'N/A'})` : 'Unknown'} | Contact: ${issue.StudentId ? issue.StudentId.Contact : 'N/A'}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary);">Date: ${new Date(issue.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
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
                        <label for="status-${issue._id}" style="font-size: 0.85em; font-weight: 600;">Update Status:</label>
                        <select id="status-${issue._id}" onchange="updateIssueStatus('${issue._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--bg-color); color: var(--text-primary); cursor: pointer;">
                            <option value="Pending" ${issue.Status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Seen by Admin" ${issue.Status === 'Seen by Admin' ? 'selected' : ''}>Seen by Admin</option>
                            <option value="In Progress" ${issue.Status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Resolved" ${issue.Status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No issues reported.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
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
        alert('Error updating status: ' + error.message);
        loadIssues(); // reload to revert a failed change
    }
}

async function deleteIssue(id) {
    if (!confirm('Are you sure you want to delete this resolved issue?')) return;
    try {
        await apiFetch('/issues/' + id, { method: 'DELETE' });
        loadIssues();
    } catch (error) {
        alert('Error deleting issue: ' + error.message);
    }
}
