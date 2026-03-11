// Auth Check
if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'student') {
    window.location.href = '/';
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch profile to get Name and Profile Picture
    try {
        const profile = await apiFetch('/students/profile');

        // SHOW PASSWORD BANNER
        if (profile.mustChangePassword) {
            const banner = document.getElementById("passwordBanner");
            if (banner) banner.style.display = "block";
        }

        // Update first name
        const firstName = profile.FullName ? profile.FullName.split(' ')[0] : 'Student';
        document.getElementById('studentName').textContent = firstName;

        // Update profile picture
        if (profile.ProfilePictureURL) {
            document.getElementById('navProfilePic').src = profile.ProfilePictureURL;
        }

        // Update Library ID in header
        if (profile.LibraryID) {
            document.getElementById('studentLibraryID').innerHTML = `<i class="fa-solid fa-id-badge" style="margin-right: 5px;"></i> ID: ${profile.LibraryID} &nbsp;|&nbsp;`;

            // Auto-fill forms
            const feeIdField = document.getElementById('feeLibraryID');
            const issueIdField = document.getElementById('issueLibraryID');
            if (feeIdField) feeIdField.value = profile.LibraryID;
            if (issueIdField) issueIdField.value = profile.LibraryID;
        }

        // Update joining date in header
        if (profile.JoiningDate) {
            document.getElementById('studentJoinDate').innerHTML = `
            <i class="fa-solid fa-calendar-days" style="margin-right: 5px;"></i> 
            Joined: ${new Date(profile.JoiningDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })}`;
        }

        // Save name to localStorage for future use (e.g., if profile fetch fails next time)
        localStorage.setItem('name', profile.FullName || 'Student');
    } catch (e) {
        document.getElementById('studentName').textContent = 'Student';
        // Fallback to localStorage if API fetch fails
        let rawName = localStorage.getItem('name');
        if (rawName && rawName !== 'undefined') {
            document.getElementById('studentName').textContent = rawName.split(' ')[0];
        }
    }

    // Handle routing
    window.addEventListener('hashchange', handleRoute);

    // Form Listeners
    const feeForm = document.getElementById('feeForm');
    if (feeForm) feeForm.addEventListener('submit', handleFeeSubmit);

    const issueForm = document.getElementById('issueForm');
    if (issueForm) issueForm.addEventListener('submit', handleIssueSubmit);

    // Initial route
    handleRoute();
});

function handleRoute() {
    const hash = window.location.hash || '#home';
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.style.display = 'none');

    const activeSection = document.getElementById(`view-${hash.substring(1)}`);
    if (activeSection) {
        activeSection.style.display = 'block';
    } else {
        document.getElementById('view-home').style.display = 'block';
    }

    // Load data based on route
    if (hash === '#home' || !window.location.hash) loadAnnouncements();
    if (hash === '#profile') loadProfile();
    if (hash === '#fees') loadFees();
    if (hash === '#issues') loadIssues();
}

async function loadProfile() {
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = 'Loading...';
    try {
        const data = await apiFetch('/students/profile');
        profileContent.innerHTML = `
            <div class="grid-2" style="gap: 1.5rem; margin-top: 1rem;">
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Full Name</div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.FullName}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Email Address</div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.Email}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Contact Number</div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.Contact}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Aadhar Number</div>
                        <svg onclick="openImagePreview('${data.AadharProofURL}')" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="cursor: pointer; color: var(--primary-color);" title="View Aadhar">
                          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                        </svg>
                    </div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px; display: flex; align-items: center; gap: 2px;">
                        ${data.AadharNumber && data.AadharNumber.length > 4 ?
                `<span style="letter-spacing: 2px; font-size: 1.2em; position: relative; top: -2px;">${'•'.repeat(data.AadharNumber.length - 4)}</span>` + data.AadharNumber.slice(-4)
                : data.AadharNumber || 'N/A'
            }
                    </div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border); grid-column: 1 / -1;">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Full Address</div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.FullAddress}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Account Status</div>
                    <div style="font-size: 1.1em; margin-top: 5px;">
                        <span style="padding: 4px 10px; border-radius: 12px; font-size: 0.9em; background: ${data.AccountStatus === 'Approved' ? '#DEF7EC' : '#FEF3C7'}; color: ${data.AccountStatus === 'Approved' ? '#03543F' : '#92400E'};">
                            ${data.AccountStatus}
                        </span>
                    </div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Library Seat No</div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.SeatNo}</div>
                </div>
            </div>
        `;
    } catch (error) {
        profileContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

let currentFees = [];
let feesCurrentPage = 1;
const FEES_PER_PAGE = 3;

async function loadFees(forceFetch = false) {
    const list = document.getElementById('feesList');
    if (currentFees.length === 0 || forceFetch) {
        list.innerHTML = 'Loading fees...';
        try {
            currentFees = await apiFetch('/fees/status');
            feesCurrentPage = 1;
        } catch (error) {
            list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            return;
        }
    }

    if (currentFees && currentFees.length > 0) {
        const startIndex = (feesCurrentPage - 1) * FEES_PER_PAGE;
        const endIndex = startIndex + FEES_PER_PAGE;
        const feesToShow = currentFees.slice(startIndex, endIndex);

        list.innerHTML = feesToShow.map(fee => `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div><strong>${fee.Month.charAt(0).toUpperCase() + fee.Month.slice(1)}</strong></div>

                    <div style="font-size: 0.9em; color: #555;">₹${fee.Amount}</div>

                    <div style="font-size: 0.8em; color: #888; margin-top: 4px;">
                    Submitted: ${new Date(fee.createdAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        })}
                    </div>

                    ${fee.Status === 'Rejected' && fee.AdminNote
                ? `<div style="margin-top:6px;background:#FEE2E2;padding:6px 8px;border-left:3px solid #DC2626;font-size:0.85em;color:#991B1B;">
                            <strong>Reason:</strong> ${fee.AdminNote}
                        </div>`
                : ''
            }

                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.85em; padding: 3px 8px; border-radius: 12px; background: ${fee.Status === 'Approved' || fee.Status === 'Paid'
                ? '#DEF7EC'
                : (fee.Status === 'Pending' ? '#FEF3C7' : '#FDE8E8')
            }; color: ${fee.Status === 'Approved' || fee.Status === 'Paid'
                ? '#03543F'
                : (fee.Status === 'Pending' ? '#92400E' : '#9B1C1C')
            }">
                        ${fee.Status}
                    </span>

                    <svg onclick="openImagePreview('${fee.ProofImageURL}')"
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        style="cursor: pointer; color: var(--primary-color);"
                        title="View Receipt">

                    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                    </svg>
                </div>
            </div>
        `).join('');

        const totalPages = Math.ceil(currentFees.length / FEES_PER_PAGE);
        const paginationContainer = document.getElementById('feesPagination');
        if (totalPages > 1) {
            let paginationHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9em;">';
            paginationHTML += `<button onclick="changeFeesPage(${feesCurrentPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${feesCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            paginationHTML += `<span style="font-weight: 500; color: #4B5563;">Page ${feesCurrentPage} of ${totalPages}</span>`;
            paginationHTML += `<button onclick="changeFeesPage(${feesCurrentPage + 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${feesCurrentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            paginationHTML += '</div>';
            paginationContainer.innerHTML = paginationHTML;
        } else {
            if (paginationContainer) paginationContainer.innerHTML = '';
        }
    } else {
        list.innerHTML = '<p>No fee records found.</p>';
        const paginationContainer = document.getElementById('feesPagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
}

function changeFeesPage(page) {
    const totalPages = Math.ceil(currentFees.length / FEES_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    feesCurrentPage = page;
    loadFees(false);
}

let currentIssues = [];
let issuesCurrentPage = 1;
const ISSUES_PER_PAGE = 3;

async function loadIssues(forceFetch = false) {
    const list = document.getElementById('issuesList');
    if (currentIssues.length === 0 || forceFetch) {
        list.innerHTML = 'Loading issues...';
        try {
            currentIssues = await apiFetch('/issues/my');
            issuesCurrentPage = 1;
        } catch (error) {
            list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            return;
        }
    }

    if (currentIssues && currentIssues.length > 0) {
        const startIndex = (issuesCurrentPage - 1) * ISSUES_PER_PAGE;
        const endIndex = startIndex + ISSUES_PER_PAGE;
        const issuesToShow = currentIssues.slice(startIndex, endIndex);

        list.innerHTML = issuesToShow.map(issue => `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <strong>${issue.IssueTitle.charAt(0).toUpperCase() + issue.IssueTitle.slice(1)}</strong>
                    <span style="font-size: 0.8em; color: #888;">${new Date(issue.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div style="font-size: 0.9em; color: #555; margin-top: 5px;">${issue.Description}</div>
                <div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>Status:</strong> <span style="color: ${issue.Status === 'Resolved' ? 'green' : (issue.Status === 'In Progress' ? 'orange' : 'red')}">${issue.Status}</span></div>
                    ${issue.Status === 'Resolved' ? `<button onclick="deleteIssue('${issue._id}')" class="btn-outline" style="padding: 0.2rem 0.5rem; border-color: #ef4444; color: #ef4444; border-radius: 4px; font-size: 0.85em;"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
                </div>
                ${issue.AdminResponse ? `<div style="margin-top: 5px; background: #f9f9f9; padding: 5px; border-left: 3px solid #4F46E5;"><strong>Admin Reply:</strong> ${issue.AdminResponse}</div>` : ''}
            </div>
        `).join('');

        const totalPages = Math.ceil(currentIssues.length / ISSUES_PER_PAGE);
        const paginationContainer = document.getElementById('issuesPagination');
        if (totalPages > 1) {
            let paginationHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9em;">';
            paginationHTML += `<button onclick="changeIssuesPage(${issuesCurrentPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${issuesCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            paginationHTML += `<span style="font-weight: 500; color: #4B5563;">Page ${issuesCurrentPage} of ${totalPages}</span>`;
            paginationHTML += `<button onclick="changeIssuesPage(${issuesCurrentPage + 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${issuesCurrentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            paginationHTML += '</div>';
            paginationContainer.innerHTML = paginationHTML;
        } else {
            if (paginationContainer) paginationContainer.innerHTML = '';
        }
    } else {
        list.innerHTML = '<p>No issues reported.</p>';
        const paginationContainer = document.getElementById('issuesPagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
}

function changeIssuesPage(page) {
    const totalPages = Math.ceil(currentIssues.length / ISSUES_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    issuesCurrentPage = page;
    loadIssues(false);
}

async function deleteIssue(id) {
    if (!confirm('Are you sure you want to delete this resolved issue?')) return;
    try {
        await apiFetch('/issues/' + id, { method: 'DELETE' });
        await loadIssues(true);
    } catch (error) {
        alert('Error deleting issue: ' + error.message);
    }
}

function showUpdateProfileModal() {
    alert("Profile update request functionality to be integrated.");
}

async function handleFeeSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('feeSubmitBtn');
    const msg = document.getElementById('feeMsg');

    btn.disabled = true;
    btn.textContent = 'Uploading...';
    msg.textContent = '';

    const formData = new FormData();
    formData.append('Month', document.getElementById('feeMonth').value);
    formData.append('Amount', document.getElementById('feeAmount').value);
    formData.append('receipt', document.getElementById('feeReceipt').files[0]);

    try {
        await apiFetch('/fees/upload', {
            method: 'POST',
            body: formData
        });
        msg.style.color = 'green';
        msg.textContent = 'Receipt uploaded successfully!';
        document.getElementById('feeMonth').value = '';
        document.getElementById('feeAmount').value = '';
        document.getElementById('feeReceipt').value = '';

        loadFees(true); // Force fetch and refresh list
    } catch (error) {
        msg.style.color = 'red';
        msg.textContent = error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Receipt';
    }
}

async function handleIssueSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('issueMsg');

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    msg.textContent = '';

    const payload = {
        IssueTitle: document.getElementById('issueTitle').value,
        Description: document.getElementById('issueDesc').value
    };

    try {
        await apiFetch('/issues/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        msg.style.color = 'green';
        msg.textContent = 'Issue reported successfully!';
        document.getElementById('issueForm').reset();
        loadIssues(true); // Force fetch new issue and reset pagination
    } catch (error) {
        msg.style.color = 'red';
        msg.textContent = error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Issue';
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

async function loadAnnouncements() {
    const list = document.getElementById('announcementsList');

    try {
        const data = await apiFetch('/announcements');

        if (data && data.length > 0) {
            list.innerHTML = data.map(ann => `
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${ann.Title}</strong>
                    <p style="margin: 5px 0; color: #555;">${ann.Message}</p>
                    <small style="color: #888;">
                        ${new Date(ann.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            })}
                    </small>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>No announcements found.</p>';
        }

    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error loading announcements: ${error.message}</p>`;
    }
}

function openImagePreview(url) {
    if (!url) {
        alert("No receipt image available.");
        return;
    }
    document.getElementById('previewImageElement').src = url;
    document.getElementById('imagePreviewModal').style.display = 'flex';
}

function closeImagePreview() {
    document.getElementById('imagePreviewModal').style.display = 'none';
    document.getElementById('previewImageElement').src = '';
}


async function promptChangePassword() {

    const currentPassword = prompt("Enter your CURRENT password:");

    if (!currentPassword) return;

    const newPassword = prompt("Enter your NEW password:");

    if (!newPassword || newPassword.length < 6) {
        alert("New password must be at least 6 characters.");
        return;
    }

    try {

        await apiFetch('/students/change-password', {
            method: 'PUT',
            body: JSON.stringify({
                CurrentPassword: currentPassword,
                NewPassword: newPassword
            })
        });

        alert("Password updated successfully.");

        // Hide banner after update
        document.getElementById("passwordBanner").style.display = "none";

    } catch (error) {

        alert("Error updating password: " + error.message);

    }
}