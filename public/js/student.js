// Auth Check
if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'student') {
    window.location.href = '/';
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

let originalProfileData = {};
let cropper = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch profile to get Name and Profile Picture
    try {
        const profile = await apiFetch('/students/profile');
        originalProfileData = profile;

        // SHOW INACTIVE BANNER
        if (profile.AccountStatus === 'Inactive') {
            const banner = document.getElementById("inactiveBanner");
            if (banner) {
                banner.style.display = "block";
                const whatsappBtn = document.getElementById('inactiveWhatsappBtn');
                const emailBtn = document.getElementById('inactiveEmailBtn');
                if (profile.LibraryID) {
                    const message = encodeURIComponent(`Hello, I am writing regarding my inactive account. My Library ID is ${profile.LibraryID}.`);
                    if (whatsappBtn) whatsappBtn.href = `https://wa.me/917903547986?text=${message}`;
                    if (emailBtn) emailBtn.href = `mailto:knowledgenooklibrary@gmail.com?subject=Account Inactive (ID: ${profile.LibraryID})&body=${message}`;
                }
            }
        }

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

        // Auto-fill Fee Amount and Batch
        const feeBatchField = document.getElementById('feeBatch');
        const feeAmountField = document.getElementById('feeAmount');
        if (feeBatchField) feeBatchField.value = profile.batchType || 'N/A';
        if (feeAmountField) feeAmountField.value = profile.amount || 0;

        // Update Plan in header
        const planText = profile.planDuration ? `${profile.planDuration} (${profile.batchType || 'N/A'} - ₹${profile.amount || 0})` : 'N/A';
        document.getElementById('studentPlan').innerHTML = `<i class="fa-solid fa-clock" style="margin-right: 5px;"></i> Plan: ${planText} &nbsp;|&nbsp;`;

        // Update joining date in header
        if (profile.JoiningDate) {
            document.getElementById('studentJoinDate').innerHTML = `
            <i class="fa-solid fa-calendar-days" style="margin-right: 5px;"></i> 
            Joined: ${new Date(profile.JoiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}`;
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

    const profileUpdateForm = document.getElementById('profileUpdateForm');
    if (profileUpdateForm) profileUpdateForm.addEventListener('submit', handleProfileUpdateSubmit);

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
    if (hash === '#requests') loadRequestsHistory();
}

async function loadProfile() {
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = 'Loading...';
    try {
        const data = await apiFetch('/students/profile');
        originalProfileData = data; // Keep a copy for the update modal
        profileContent.innerHTML = `
            <div class="grid-2" style="gap: 1.5rem; margin-top: 1rem;">
                <!-- Status Container Placeholder -->
                <div id="profileRequestStatusContainer" style="grid-column: 1 / -1; display:none;"></div>

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
                        
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${data.AadharStatus === 'Rejected' ? 
                                `<div style="text-align: right;">
                                    <span style="font-size: 0.8em; color: #ef4444; font-weight: 500;"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>
                                    <div style="font-size: 0.75em; color: #ef4444;">${data.AadharRejectionReason || 'Please re-upload'}</div>
                                 </div>` : ''}

                            ${data.AadharStatus === 'Pending' ? 
                                `<span style="font-size: 0.8em; color: #D97706; background: #FEF3C7; padding: 2px 8px; border-radius: 4px;"><i class="fa-solid fa-clock"></i> Verification Pending</span>` : ''}

                            ${data.AadharProofURL ? 
                                `<svg onclick="openImagePreview('${data.AadharProofURL}')" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="cursor: pointer; color: var(--primary-color);" title="View Aadhar">
                                  <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                  <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                </svg>` : ''
                            }

                            ${data.AadharStatus === 'Not Uploaded' || data.AadharStatus === 'Rejected' || (!data.AadharProofURL) ? 
                                `<div>
                                    <label for="aadharUploadInput" class="btn-outline" style="padding: 2px 8px; font-size: 0.8em; cursor: pointer;">
                                        <i class="fa-solid fa-upload"></i> ${data.AadharStatus === 'Rejected' ? 'Re-upload' : 'Upload'}
                                    </label>
                                    <input type="file" id="aadharUploadInput" accept="image/*" style="display: none;" onchange="handleAadharUpload(this)">
                                </div>` : ''
                            }

                            ${data.AadharStatus === 'Verified' ? 
                                `<span style="color: #059669;" title="Verified"><i class="fa-solid fa-circle-check"></i></span>` : ''
                            }
                        </div>
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
                        ${data.AccountStatus === 'Pending' ? `
                        <div style="margin-top: 10px; font-size: 0.85em;">
                            <a href="https://wa.me/917903547986" target="_blank" style="color: #25D366; margin-right: 10px; text-decoration: none; font-weight: 500;"><i class="fa-brands fa-whatsapp"></i> Chat</a>
                            <a href="tel:+917903547986" style="color: var(--primary-color); text-decoration: none; font-weight: 500;"><i class="fa-solid fa-phone"></i> Call</a>
                        </div>` : ''}
                    </div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.85em; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Library Seat No</div>
                    <div style="font-size: 1.1em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.SeatNo}</div>
                </div>
            </div>
        `;

        // Load request status after profile renders
        loadProfileRequestStatus();
    } catch (error) {
        profileContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function loadProfileRequestStatus() {
    const container = document.getElementById('profileRequestStatusContainer');
    if (!container) return;

    try {
        const request = await apiFetch('/students/profile-update-request');

        if (request && !request.SeenByStudent) {
            container.style.display = 'block';
            let bannerHTML = '';
            if (request.Status === 'Pending' || request.Status === 'Under Review') {
                bannerHTML = `
                    <div style="background: ${request.Status === 'Under Review' ? '#EFF6FF' : '#FFFBEB'}; border: 1px solid ${request.Status === 'Under Review' ? '#BFDBFE' : '#FCD34D'}; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: ${request.Status === 'Under Review' ? '#1E40AF' : '#92400E'}; margin-bottom: 4px;">
                                <i class="fa-solid fa-circle-info"></i> Update Request ${request.Status}
                            </div>
                            <div style="font-size: 0.9em; color: var(--text-secondary);">
                                You requested to update: <strong>${request.ProposedData ? Object.keys(request.ProposedData).join(', ') : ''}</strong>
                            </div>
                        </div>
                        <span style="font-size: 0.8em; color: var(--text-secondary);">${new Date(request.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                    </div>`;
            } else if (request.Status === 'Approved') {
                bannerHTML = `
                    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 15px; border-radius: 8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-weight: 600; color: #065F46; margin-bottom: 4px;"><i class="fa-solid fa-check-circle"></i> Profile Update Approved</div>
                            <button onclick="dismissRequestNotification('${request._id}')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#065F46;">&times;</button>
                        </div>
                        <p style="font-size: 0.9em; color: #047857;">Your profile has been successfully updated with the requested changes.</p>
                    </div>`;
            } else if (request.Status === 'Rejected') {
                bannerHTML = `
                    <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-weight: 600; color: #991B1B; margin-bottom: 4px;"><i class="fa-solid fa-times-circle"></i> Profile Update Rejected</div>
                            <button onclick="dismissRequestNotification('${request._id}')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#991B1B;">&times;</button>
                        </div>
                        <p style="font-size: 0.9em; color: #B91C1C;">Your request was rejected. <strong>Reason:</strong> ${request.AdminNote || 'No reason provided.'}</p>
                    </div>
                `;
            }
            container.innerHTML = bannerHTML;
        } else {
            container.style.display = 'none';
        }
    } catch (e) {
        console.error("Failed to load request status", e);
    }
}

async function dismissRequestNotification(id) {
    const container = document.getElementById('profileRequestStatusContainer');
    try {
        await apiFetch(`/students/profile-update-request/${id}/seen`, { method: 'PUT' });
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    } catch (error) {
        alert('Could not dismiss notification. Please try again.');
        console.error(error);
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
                    Submitted: ${new Date(fee.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
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
                    <span style="font-size: 0.8em; color: #888;">${new Date(issue.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
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


// --- Requests History Logic ---
let requestsCurrentPage = 1;
const REQUESTS_PER_PAGE = 5;

async function loadRequestsHistory() {
    const list = document.getElementById('requestsHistoryList');
    const paginationContainer = document.getElementById('requestsPagination');
    const actionsContainer = document.getElementById('requestsActions');
    const selectAllCheckbox = document.getElementById('selectAllRequests');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    
    list.innerHTML = 'Loading history...';
    paginationContainer.innerHTML = '';
    actionsContainer.style.display = 'none';
    selectAllCheckbox.checked = false;
    bulkDeleteBtn.disabled = true;

    try {
        const data = await apiFetch(`/students/profile-requests?page=${requestsCurrentPage}&limit=${REQUESTS_PER_PAGE}`);
        
        if (data.requests && data.requests.length > 0) {
            actionsContainer.style.display = 'flex';

            list.innerHTML = data.requests.map(req => {
                // Format the proposed changes
                const changes = Object.entries(req.ProposedData || {})
                    .map(([key, val]) => `<span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 5px; color: #374151;">${key}: ${val}</span>`)
                    .join('');
                
                const isLocked = ['Pending', 'Under Review'].includes(req.Status);

                return `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                             ${!isLocked ? `<input type="checkbox" class="request-checkbox" value="${req._id}" onchange="updateBulkDeleteState()">` : '<i class="fa-solid fa-lock" title="Active requests cannot be deleted" style="color: #ccc; width: 13px;"></i>'}
                             <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: ${req.Status === 'Approved' ? '#DEF7EC' : (req.Status === 'Rejected' || req.Status === 'Cancelled' ? '#FDE8E8' : (req.Status === 'Under Review' ? '#DBEAFE' : '#FEF3C7'))}; color: ${req.Status === 'Approved' ? '#03543F' : (req.Status === 'Rejected' || req.Status === 'Cancelled' ? '#9B1C1C' : (req.Status === 'Under Review' ? '#1E40AF' : '#92400E'))}; font-weight: 500;">
                                ${req.Status}
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <small style="color: var(--text-secondary);">
                                ${new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                            </small>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 4px;">Requested Changes:</div>
                        <div>${changes || '<em style="color:#999">No data</em>'}</div>
                    </div>

                    ${req.AdminNote ? `<div style="font-size: 0.9em; background: ${req.Status === 'Rejected' || req.Status === 'Cancelled' ? '#FEF2F2' : '#F9FAFB'}; padding: 8px; border-radius: 6px; border-left: 3px solid ${req.Status === 'Rejected' || req.Status === 'Cancelled' ? '#EF4444' : '#D1D5DB'}; color: ${req.Status === 'Rejected' || req.Status === 'Cancelled' ? '#B91C1C' : '#4B5563'};"><strong>Note:</strong> ${req.AdminNote}</div>` : ''}
                </div>
            `}).join('');

            // Pagination Controls
            if (data.totalPages > 1) {
                let paginationHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9em;">';
                paginationHTML += `<button onclick="changeRequestsPage(${requestsCurrentPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${requestsCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
                paginationHTML += `<span style="font-weight: 500; color: #4B5563;">Page ${requestsCurrentPage} of ${data.totalPages}</span>`;
                paginationHTML += `<button onclick="changeRequestsPage(${requestsCurrentPage + 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${requestsCurrentPage === data.totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
                paginationHTML += '</div>';
                paginationContainer.innerHTML = paginationHTML;
            }
        } else {
            list.innerHTML = '<p style="color: var(--text-secondary);">No request history found.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function changeRequestsPage(page) {
    if (page < 1) return;
    requestsCurrentPage = page;
    loadRequestsHistory();
}

function toggleSelectAllRequests() {
    const selectAll = document.getElementById('selectAllRequests');
    const checkboxes = document.querySelectorAll('.request-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkDeleteState();
}

function updateBulkDeleteState() {
    const checkboxes = document.querySelectorAll('.request-checkbox:checked');
    const bulkBtn = document.getElementById('bulkDeleteBtn');
    bulkBtn.disabled = checkboxes.length === 0;
    bulkBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Delete Selected (${checkboxes.length})`;
}

async function deleteSelectedRequests() {
    const checkboxes = document.querySelectorAll('.request-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);

    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }

    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} items from your history?`)) return;

    try {
        await apiFetch('/students/profile-requests', { 
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
        loadRequestsHistory();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteProfileRequest(id) {
    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }
    if (!confirm('Are you sure you want to delete this item from your history?')) return;
    try {
        await apiFetch(`/students/profile-requests/${id}`, { method: 'DELETE' });
        loadRequestsHistory(); // Refresh the list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteIssue(id) {
    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }
    if (!confirm('Are you sure you want to delete this resolved issue?')) return;
    try {
        await apiFetch('/issues/' + id, { method: 'DELETE' });
        await loadIssues(true);
    } catch (error) {
        alert('Error deleting issue: ' + error.message);
    }
}

function showUpdateProfileModal() {
    const modal = document.getElementById('profileUpdateModal');
    const content = document.getElementById('profileUpdateModalContent');
    const msg = document.getElementById('profileUpdateMsg');
    msg.textContent = '';
    // Reset button state
    const btn = document.querySelector('#profileUpdateForm button[type="submit"]');
    if(btn) { btn.disabled = false; btn.textContent = 'Submit Request'; }

    const student = originalProfileData;
    if (!student || Object.keys(student).length === 0) {
        alert('Profile data not loaded yet. Please wait a moment and try again.');
        return;
    }

    content.innerHTML = `
        <div class="form-group">
            <label>Email</label>
            <input type="email" id="updateEmail" value="${student.Email || ''}">
        </div>
        <div class="form-group">
            <label>Contact</label>
            <input type="text" id="updateContact" value="${student.Contact || ''}" required>
        </div>
    `;

    modal.style.display = 'block';
}

function closeProfileUpdateModal() {
    document.getElementById('profileUpdateModal').style.display = 'none';
}

async function handleProfileUpdateSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msg = document.getElementById('profileUpdateMsg');

    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    msg.textContent = '';

    const updatedData = {
        Email: document.getElementById('updateEmail').value,
        Contact: document.getElementById('updateContact').value,
    };

    const proposedData = {};
    for (const key in updatedData) {
        const originalValue = originalProfileData[key];
        const updatedValue = updatedData[key];
        if (String(updatedValue ?? '').trim() !== String(originalValue ?? '').trim()) {
            proposedData[key] = updatedValue;
        }
    }

    if (Object.keys(proposedData).length === 0) {
        msg.style.color = 'var(--text-secondary)';
        msg.textContent = 'No changes were made.';
        btn.disabled = false;
        btn.textContent = 'Submit Request';
        return;
    }

    try {
        await apiFetch('/students/profile-update', {
            method: 'POST',
            body: JSON.stringify(proposedData)
        });
        msg.style.color = 'var(--success-color)';
        msg.textContent = 'Update request submitted successfully!';
        setTimeout(() => {
            closeProfileUpdateModal();
            loadProfileRequestStatus(); // Refresh status
        }, 2000);
    } catch (error) {
        msg.style.color = 'var(--error-color)';
        msg.textContent = error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Request';
    }
}

async function handleFeeSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('feeSubmitBtn');
    const msg = document.getElementById('feeMsg');

    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Uploading...';
    msg.textContent = '';

    const formData = new FormData();
    formData.append('Month', document.getElementById('feeMonth').value);
    formData.append('Amount', document.getElementById('feeAmount').value);
    formData.append('Batch', document.getElementById('feeBatch').value);
    formData.append('receipt', document.getElementById('feeReceipt').files[0]);

    try {
        await apiFetch('/fees/upload', {
            method: 'POST',
            body: formData
        });
        msg.style.color = 'green';
        msg.textContent = 'Receipt uploaded successfully!';
        document.getElementById('feeMonth').value = '';
        // document.getElementById('feeAmount').value = ''; // Keep amount fixed
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

    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }

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
                        ${new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
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
        alert("No image available to preview.");
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

    if (originalProfileData.AccountStatus === 'Inactive') {
        alert("Your account is inactive. You cannot perform this action.");
        return;
    }

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

async function handleProfilePicUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        if (originalProfileData.AccountStatus === 'Inactive') {
            alert("Your account is inactive. You cannot perform this action.");
            input.value = '';
            return;
        }

        // Ensure it is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Open Modal with image
            const image = document.getElementById('cropImage');
            image.src = e.target.result;
            document.getElementById('cropModal').style.display = 'block';

            // Initialize Cropper
            if (cropper) {
                cropper.destroy();
            }
            cropper = new Cropper(image, {
                aspectRatio: 1, // Square for profile
                viewMode: 1,
                autoCropArea: 1,
            });
        };
        reader.readAsDataURL(file);
        
        // Clear input to allow re-selecting the same file if cancelled
        input.value = '';
    }
}

function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

async function saveCroppedImage() {
    if (!cropper) return;

    const btn = document.querySelector('#cropModal button');
    const originalText = btn.textContent;
    btn.textContent = 'Uploading...';
    btn.disabled = true;

    // Get cropped canvas (300x300 is usually sufficient for profile pics)
    cropper.getCroppedCanvas({ width: 300, height: 300 }).toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('profilePic', blob, 'profile.png');

        try {
            const data = await apiFetch('/students/update-profile-pic', {
                method: 'POST',
                body: formData
            });
            alert('Profile picture updated successfully');
            closeCropModal();
            loadProfile(); // Refresh profile section
            document.getElementById('navProfilePic').src = data.profilePictureURL; // Update nav bar
        } catch (error) {
            alert('Failed to update profile picture: ' + error.message);
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }, 'image/png');
}

async function handleAadharUpload(input) {
    if (input.files && input.files[0]) {
        if (originalProfileData.AccountStatus === 'Inactive') {
            alert("Your account is inactive. You cannot perform this action.");
            input.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('aadharProof', input.files[0]);

        try {
            // Optimistic UI update could go here
            await apiFetch('/students/update-aadhar', {
                method: 'POST',
                body: formData
            });
            alert('Aadhar proof uploaded successfully! Please wait for admin verification.');
            loadProfile(); // Refresh to show pending status
        } catch (error) {
            alert('Failed to update Aadhar proof: ' + error.message);
        }
    }
}