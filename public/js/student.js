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
let activeBanners = [];
let currentBannerIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme(); // Initialize Dark Mode Preference
    injectCustomUI(); // Inject Toast/Modal HTML

    // Fetch profile to get Name and Profile Picture
    try {
        const profile = await apiFetch('/students/profile');
        originalProfileData = profile;

        // --- BANNER LOGIC START ---
        activeBanners = [];
        // Reset displays
        const inactiveEl = document.getElementById('inactiveBanner');
        const pendingEl = document.getElementById('pendingBanner');
        const passwordEl = document.getElementById('passwordBanner');

        if (inactiveEl) inactiveEl.style.display = 'none';
        if (pendingEl) pendingEl.style.display = 'none';
        if (passwordEl) passwordEl.style.display = 'none';

        if (profile.AccountStatus === 'Inactive') {
            const banner = document.getElementById("inactiveBanner");
            if (banner) {
                const whatsappBtn = document.getElementById('inactiveWhatsappBtn');
                const emailBtn = document.getElementById('inactiveEmailBtn');
                if (profile.LibraryID) {
                    const message = encodeURIComponent(`Hello, I am writing regarding my inactive account. My Library ID is ${profile.LibraryID}.`);
                    if (whatsappBtn) whatsappBtn.href = `https://wa.me/917903547986?text=${message}`;
                    if (emailBtn) emailBtn.href = `mailto:knowledgenooklibrary@gmail.com?subject=Account Inactive (ID: ${profile.LibraryID})&body=${message}`;
                }
                activeBanners.push('inactiveBanner');
            }
        } else if (profile.AccountStatus === 'Pending') {
            const banner = document.getElementById("pendingBanner");
            if (banner) {
                const emailBtn = document.getElementById('pendingEmailBtn');
                if (profile.LibraryID) {
                    const idDisplay = document.getElementById('pendingIdDisplay');
                    if (idDisplay) idDisplay.textContent = `ID: ${profile.LibraryID}`;

                    const message = encodeURIComponent(`Hello, I am writing regarding my pending account application. My Library ID is ${profile.LibraryID}.`);
                    if (emailBtn) emailBtn.href = `mailto:knowledgenooklibrary@gmail.com?subject=Account Pending Approval (ID: ${profile.LibraryID})&body=${message}`;
                }
                activeBanners.push('pendingBanner');
            }
        }

        // Show password banner if needed (and not inactive)
        if (profile.mustChangePassword && profile.AccountStatus !== 'Inactive') {
            const banner = document.getElementById("passwordBanner");
            if (banner) activeBanners.push('passwordBanner');
        }

        updateBannerUI();
        // --- BANNER LOGIC END ---

        // Update first name
        const firstName = profile.FullName ? profile.FullName.split(' ')[0] : 'Student';
        document.getElementById('studentName').textContent = firstName;

        // Update profile picture
        if (profile.ProfilePictureURL) {
            document.getElementById('navProfilePic').src = profile.ProfilePictureURL;
        }

        // Update Library ID in header
        if (profile.LibraryID) {
            document.getElementById('studentLibraryID').innerHTML = `<i class="fa-solid fa-id-badge" style="margin-right: 5px;"></i> ID: ${profile.LibraryID} &nbsp;&nbsp;`;

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
        const planText = profile.planDuration ? `${profile.planDuration} (${profile.batchType || 'N/A'}) | ${profile.batchTiming || 'N/A'} | ${profile.SeatNo || 0}` : 'N/A';
        document.getElementById('studentPlan').innerHTML = `<i class="fa-solid fa-clock" style="margin-right: 5px;"></i>${planText} &nbsp;&nbsp;`;

        // Update joining date in header
        if (profile.JoiningDate) {
            document.getElementById('studentJoinDate').innerHTML = `
            <i class="fa-solid fa-calendar-days" style="margin-right: 5px;"></i> 
            ${new Date(profile.JoiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}`;
        }

        // Save name to localStorage for future use (e.g., if profile fetch fails next time)
        localStorage.setItem('name', profile.FullName || 'Student');

        // Prompt for Push Notifications slightly after loading so it isn't aggressive
        setTimeout(subscribeToPushNotifications, 2000); 
        
        fetchNotificationCount();
        loadAnnouncements(); // Fetch announcements immediately to update unread badge globally
    } catch (e) {
        document.getElementById('studentName').textContent = 'Student';
        // Fallback to localStorage if API fetch fails
        let rawName = localStorage.getItem('name');
        if (rawName && rawName !== 'undefined') {
            document.getElementById('studentName').textContent = rawName.split(' ')[0];
        }
    }

    // Form Validation Listeners
    const feeMonth = document.getElementById('feeMonth');
    const feeReceipt = document.getElementById('feeReceipt');
    if (feeMonth) feeMonth.addEventListener('input', validateFeeForm);
    if (feeReceipt) feeReceipt.addEventListener('change', validateFeeForm);

    const issueTitle = document.getElementById('issueTitle');
    const issueDesc = document.getElementById('issueDesc');
    if (issueTitle) issueTitle.addEventListener('input', validateIssueForm);
    if (issueDesc) issueDesc.addEventListener('input', validateIssueForm);

    // Handle routing
    window.addEventListener('hashchange', handleRoute);

    // Form Listeners
    const feeForm = document.getElementById('feeForm');
    if (feeForm) feeForm.addEventListener('submit', handleFeeSubmit);

    const issueForm = document.getElementById('issueForm');
    if (issueForm) issueForm.addEventListener('submit', handleIssueSubmit);

    const profileUpdateForm = document.getElementById('profileUpdateForm');
    if (profileUpdateForm) profileUpdateForm.addEventListener('submit', handleProfileUpdateSubmit);

    // Bind Change Password Submit
    // Note: The HTML calls submitChangePassword(event) directly, but we need to define it.

    // Initial route
    handleRoute();
});

function validateFeeForm() {
    const feeMonth = document.getElementById('feeMonth');
    const feeReceipt = document.getElementById('feeReceipt');
    const feeSubmitBtn = document.getElementById('feeSubmitBtn');

    if (feeMonth && feeReceipt && feeSubmitBtn) {
        if (feeMonth.value.trim() !== '' && feeReceipt.files.length > 0) {
            feeSubmitBtn.disabled = false;
            feeSubmitBtn.style.opacity = '1';
            feeSubmitBtn.style.cursor = 'pointer';
        } else {
            feeSubmitBtn.disabled = true;
            feeSubmitBtn.style.opacity = '0.5';
            feeSubmitBtn.style.cursor = 'not-allowed';
        }
    }
}

function validateIssueForm() {
    const issueTitle = document.getElementById('issueTitle');
    const issueDesc = document.getElementById('issueDesc');
    const issueSubmitBtn = document.getElementById('issueSubmitBtn');

    if (issueTitle && issueDesc && issueSubmitBtn) {
        if (issueTitle.value.trim() !== '' && issueDesc.value.trim() !== '') {
            issueSubmitBtn.disabled = false;
            issueSubmitBtn.style.opacity = '1';
            issueSubmitBtn.style.cursor = 'pointer';
        } else {
            issueSubmitBtn.disabled = true;
            issueSubmitBtn.style.opacity = '0.5';
            issueSubmitBtn.style.cursor = 'not-allowed';
        }
    }
}

window.navigateBanners = function(direction) {
    if (activeBanners.length <= 1) return;
    currentBannerIndex += direction;
    if (currentBannerIndex < 0) currentBannerIndex = activeBanners.length - 1;
    if (currentBannerIndex >= activeBanners.length) currentBannerIndex = 0;
    updateBannerUI();
}

function updateBannerUI() {
    const wrapper = document.getElementById('bannerWrapper');
    if (!wrapper) return;

    const prevBtn = document.getElementById('btnBannerPrev');
    const nextBtn = document.getElementById('btnBannerNext');
    
    // Hide all banners first (handled by reset, but good safety)
    activeBanners.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (activeBanners.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';
    const currentBanner = document.getElementById(activeBanners[currentBannerIndex]);
    if (currentBanner) currentBanner.style.display = 'block';

    const showControls = activeBanners.length > 1;
    if (prevBtn) prevBtn.style.display = showControls ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = showControls ? 'flex' : 'none';
}

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
    if (hash === '#notifications') { loadNotifications(); }
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
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-user" style="color:var(--primary-color); font-size:0.9em;"></i> Name</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.FullName}</div>
                </div>

                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-cake-candles" style="color:var(--primary-color); font-size:0.9em;"></i> Date of Birth</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;"> 
                       ${data.DOB 
                        ? new Date(data.DOB)
                            .toLocaleDateString('en-GB',{
                                day:'2-digit',
                                month:'short',
                                year:'numeric'
                            })
                            .replace(/ /g,'-')
                             : 'N/A'}
                    </div>
                </div>

                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-envelope" style="color:var(--primary-color); font-size:0.9em;"></i> Email</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.Email}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-phone" style="color:var(--primary-color); font-size:0.9em;"></i> Phone</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.Contact}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-id-card" style="color:var(--primary-color); font-size:0.9em;"></i> Aadhar</div>
                        
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${data.AadharStatus === 'Rejected' ? 
                                `<div style="text-align: right;">
                                    <span style="font-size: 0.9em; color: var(--error-color); font-weight: 500;"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>
                                    <div style="font-size: 0.85em; color: var(--error-color);">${data.AadharRejectionReason || 'Please re-upload'}</div>
                                 </div>` : ''}

                            ${data.AadharStatus === 'Pending' ? 
                                `<span style="font-size: 0.9em; color: var(--warning-color); background: var(--bg-color); border: 1px solid currentColor; padding: 2px 8px; border-radius: 4px;"><i class="fa-solid fa-clock"></i> Verification Pending</span>` : ''}

                            ${data.AadharProofURL ? 
                                `<svg onclick="openImagePreview('${data.AadharProofURL}')" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="cursor: pointer; color: var(--primary-color);" title="View Aadhar">
                                  <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                  <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                </svg>` : ''
                            }

                            ${data.AadharStatus === 'Not Uploaded' || data.AadharStatus === 'Rejected' || (!data.AadharProofURL) ? 
                                `<div>
                                    <label for="aadharUploadInput" class="btn-outline" style="padding: 4px 10px; font-size: 0.9em; cursor: pointer;">
                                        <i class="fa-solid fa-upload"></i> ${data.AadharStatus === 'Rejected' ? 'Re-upload' : 'Upload'}
                                    </label>
                                    <input type="file" id="aadharUploadInput" accept="image/*" style="display: none;" onchange="handleAadharUpload(this)">
                                </div>` : ''
                            }

                            ${data.AadharStatus === 'Verified' ? 
                                `<span style="color: var(--success-color);" title="Verified"><i class="fa-solid fa-circle-check"></i></span>` : ''
                            }
                        </div>
                    </div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px; display: flex; align-items: center; gap: 2px;">
                        ${data.AadharNumber && data.AadharNumber.length > 4 ?
                `<span style="letter-spacing: 2px; font-size: 1.2em; position: relative; top: -2px;">${'•'.repeat(data.AadharNumber.length - 4)}</span>` + data.AadharNumber.slice(-4)
                : data.AadharNumber || 'N/A'
            }
                    </div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border); grid-column: 1 / -1;">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-location-dot" style="color:var(--primary-color); font-size:0.9em;"></i> Address</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.FullAddress}</div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-id-card" style="color:var(--primary-color); font-size:0.9em;"></i> Status</div>
                    <div style="font-size: 1.2em; margin-top: 5px;">
                        <span style="padding: 4px 10px; border-radius: 12px; font-size: 0.95em; border: 1px solid currentColor; background: var(--bg-color); color: ${data.AccountStatus === 'Active' ? 'var(--success-color)' : 'var(--warning-color)'}; font-weight: 600;">
                            ${data.AccountStatus}
                        </span>
                    </div>
                </div>
                <div style="background: var(--input-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-chair" style="color:var(--primary-color); font-size:0.9em;"></i> Seat No</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.SeatNo}</div>
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
                    <div style="background: var(--bg-color); border: 1px solid ${request.Status === 'Under Review' ? 'var(--primary-color)' : 'var(--warning-color)'}; border-left: 4px solid ${request.Status === 'Under Review' ? 'var(--primary-color)' : 'var(--warning-color)'}; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: ${request.Status === 'Under Review' ? 'var(--primary-color)' : 'var(--warning-color)'}; margin-bottom: 4px;">
                                <i class="fa-solid fa-circle-info"></i> Update Request ${request.Status}
                            </div>
                            <div style="font-size: 0.9em; color: var(--text-secondary);">
                                You requested to update: <strong>${request.ProposedData ? Object.keys(request.ProposedData).join(', ') : ''}</strong>
                            </div>
                        </div>
                        <span style="font-size: 0.9em; color: var(--text-secondary);">${new Date(request.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                    </div>`;
            } else if (request.Status === 'Approved') {
                bannerHTML = `
                    <div style="background: var(--bg-color); border: 1px solid var(--success-color); border-left: 4px solid var(--success-color); padding: 15px; border-radius: 8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-weight: 600; color: var(--success-color); margin-bottom: 4px;"><i class="fa-solid fa-check-circle"></i> Profile Update Approved</div>
                            <button onclick="dismissRequestNotification('${request._id}')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color: var(--success-color);">&times;</button>
                        </div>
                        <p style="font-size: 1em; color: var(--text-secondary);">Your profile has been successfully updated with the requested changes.</p>
                    </div>`;
            } else if (request.Status === 'Rejected') {
                bannerHTML = `
                    <div style="background: var(--bg-color); border: 1px solid var(--error-color); border-left: 4px solid var(--error-color); padding: 15px; border-radius: 8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-weight: 600; color: var(--error-color); margin-bottom: 4px;"><i class="fa-solid fa-times-circle"></i> Profile Update Rejected</div>
                            <button onclick="dismissRequestNotification('${request._id}')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color: var(--error-color);">&times;</button>
                        </div>
                        <p style="font-size: 1em; color: var(--text-secondary);">Your request was rejected. <strong>Reason:</strong> ${request.AdminNote || 'No reason provided.'}</p>
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
        showToast('Could not dismiss notification. Please try again.', 'error');
        console.error(error);
    }
}

let currentFees = [];
let filteredStudentFees = [];
let feesCurrentPage = 1;
const FEES_PER_PAGE = 3;

async function loadFees(forceFetch = false) {
    const list = document.getElementById('feesList');
    if (currentFees.length === 0 || forceFetch) {
        list.innerHTML = 'Loading fees...';
        try {
            currentFees = await apiFetch('/fees/status');
            filterStudentFees();
        } catch (error) {
            list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            return;
        }
    } else {
        filterStudentFees();
    }
}

window.filterStudentFees = function() {
    const filterValue = document.getElementById('studentFeeFilter') ? document.getElementById('studentFeeFilter').value : '';
    
    if (!filterValue) {
        filteredStudentFees = [...currentFees];
    } else if (filterValue === 'Resubmitted') {
        filteredStudentFees = currentFees.filter(fee => fee.isResubmitted && fee.Status === 'Pending');
    } else {
        filteredStudentFees = currentFees.filter(fee => fee.Status === filterValue);
    }
    
    feesCurrentPage = 1;
    renderStudentFees();
}

function renderStudentFees() {
    const list = document.getElementById('feesList');
    if (filteredStudentFees && filteredStudentFees.length > 0) {
        const startIndex = (feesCurrentPage - 1) * FEES_PER_PAGE;
        const endIndex = startIndex + FEES_PER_PAGE;
        const feesToShow = filteredStudentFees.slice(startIndex, endIndex);

        list.innerHTML = feesToShow.map(fee => `
            <div style="border-bottom: 2px solid black; padding: 10px; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong>${fee.Month.charAt(0).toUpperCase() + fee.Month.slice(1)}</strong>
                        ${fee.isResubmitted && fee.Status === 'Pending' ? `<span style="font-size: 0.75em; padding: 2px 8px; border-radius: 12px; background: var(--primary-light); color: var(--primary-color); font-weight: 600;"><i class="fa-solid fa-rotate-right"></i> Resubmitted</span>` : ''}
                    </div>

                    <div style="font-size: 1.1em; color: var(--text-primary);">₹${fee.Amount}</div>

                    <div style="font-size: 0.95em; color: var(--text-secondary); margin-top: 4px;">
                    
                    ${new Date(fee.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                    </div>

                    ${fee.Status === 'Rejected' && fee.AdminNote ? `
                    <div style="margin-top:8px;">
                        <span onclick="const el = document.getElementById('stu-reject-details-${fee._id}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; font-size: 0.85em; color: var(--error-color); display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                            <i class="fa-solid fa-circle-info"></i> Reason
                        </span>
                        <div id="stu-reject-details-${fee._id}" style="display: none; margin-top: 5px; background:var(--bg-color); padding:10px 12px; border-left:3px solid var(--error-color); border-radius:6px; font-size:0.9em; color:var(--text-primary);">
                            ${fee.AdminNote}
                        </div>
                    </div>` : ''}

                    ${fee.Status === 'Paid' && fee.AdminNote ? `
                    <div style="margin-top:8px;">
                        <span onclick="const el = document.getElementById('stu-details-${fee._id}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; font-size: 0.85em; color: var(--success-color); display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                            <i class="fa-solid fa-circle-info"></i> Payment Details
                        </span>
                        <div id="stu-details-${fee._id}" style="display: none; margin-top: 5px; background:var(--bg-color); padding:10px 12px; border-left:3px solid var(--success-color); border-radius:6px; font-size:0.9em; color:var(--text-primary);">
                            ${fee.AdminNote}
                        </div>
                    </div>` : ''}

                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.95em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${fee.Status === 'Approved' || fee.Status === 'Paid'
                ? 'var(--success-color)'
                : (fee.Status === 'Pending' ? 'var(--warning-color)' : 'var(--error-color)')
            }; font-weight: 600;">
                        ${fee.Status}
                    </span>

                    ${fee.ProofImageURL ? `
                    <svg onclick="openImagePreview('${fee.ProofImageURL}')"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        style="cursor: pointer; color: var(--primary-color);"
                        title="View Receipt">

                    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                    </svg>
                    ` : ''}

                    ${fee.Status === 'Rejected' ? `
                        <button onclick="prepareReupload('${fee.Month}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.85em; border-color: var(--primary-color); color: var(--primary-color); border-radius: 6px;">
                            <i class="fa-solid fa-upload"></i> Re-upload
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        const totalPages = Math.ceil(filteredStudentFees.length / FEES_PER_PAGE);
        const paginationContainer = document.getElementById('feesPagination');
        if (totalPages > 1) {
            let paginationHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9em;">';
            paginationHTML += `<button onclick="changeFeesPage(${feesCurrentPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${feesCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            paginationHTML += `<span style="font-weight: 500; color: var(--text-secondary); padding: 0 5px;">${feesCurrentPage} / ${totalPages}</span>`;
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
    const totalPages = Math.ceil(filteredStudentFees.length / FEES_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    feesCurrentPage = page;
    renderStudentFees();
}

let currentIssues = [];
let filteredStudentIssues = [];
let issuesCurrentPage = 1;
const ISSUES_PER_PAGE = 3;

async function loadIssues(forceFetch = false) {
    const list = document.getElementById('issuesList');
    if (currentIssues.length === 0 || forceFetch) {
        list.innerHTML = 'Loading issues...';
        try {
            currentIssues = await apiFetch('/issues/my');
            filterStudentIssues();
        } catch (error) {
            list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            return;
        }
    } else {
        filterStudentIssues();
    }
}

window.filterStudentIssues = function() {
    const filterValue = document.getElementById('studentIssueFilter') ? document.getElementById('studentIssueFilter').value : '';
    
    if (!filterValue) {
        filteredStudentIssues = [...currentIssues];
    } else {
        filteredStudentIssues = currentIssues.filter(issue => issue.Status === filterValue);
    }
    
    issuesCurrentPage = 1;
    renderStudentIssues();
}

function renderStudentIssues() {
    const list = document.getElementById('issuesList');

    if (filteredStudentIssues && filteredStudentIssues.length > 0) {

        const startIndex = (issuesCurrentPage - 1) * ISSUES_PER_PAGE;
        const endIndex = startIndex + ISSUES_PER_PAGE;
        const issuesToShow = filteredStudentIssues.slice(startIndex, endIndex);

        list.innerHTML = issuesToShow.map(issue => {

            const title = issue.IssueTitle
                ? issue.IssueTitle.charAt(0).toUpperCase() + issue.IssueTitle.slice(1)
                : '';
                
           const rawTitle = issue.IssueTitle || '';
           const maintitle = rawTitle.trim().split(/\s+/);
           const shortTitle = maintitle.length > 2 
            ? maintitle.slice(0,2).join(' ') + '...' 
            : rawTitle;

            const words = issue.Description ? issue.Description.trim().split(/\s+/) : [];
            const shortDesc = words.slice(0, 6).join(' ');
            const hasMore = words.length > 6;

            const statusColor =
                issue.Status === 'Resolved'
                    ? 'var(--success-color)'
                    : issue.Status === 'In Progress'
                        ? 'var(--warning-color)'
                        : issue.Status === 'Seen by Admin'
                            ? '#38BDF8'
                            : 'var(--error-color)';

            return `

<div style="border-bottom:2px solid red; padding:12px; margin-bottom:10px; border-radius:6px;">

    <div style="display:flex; justify-content:space-between; align-items:center;">

        <div style="display:flex; align-items:center; gap:10px">

            
            <strong style="font-size:1.05em;" title="${title}">
                ${shortTitle}
            </strong>

            ${issue.Status === 'Resolved' ? `
            <button onclick="deleteIssue('${issue._id}')"
            style="padding:3px 8px;
            border:1px solid var(--error-color);
            color:var(--error-color);
            border-radius:4px;
            font-size:0.8em;
            background:transparent;
            cursor:pointer;">
            <i class="fa-solid fa-trash"></i>
            </button>` : ''}

        </div>

        <span style="font-size:0.85em; color:var(--text-secondary);">
        ${new Date(issue.createdAt)
            .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            .replace(/ /g, '-')}
        </span>

    </div>

    <!-- Short Description -->
    <div style="font-size:0.95em; margin-top:6px; word-break:break-word;">
        <span style="color:var(--text-secondary);">
            ${shortDesc}${hasMore ? '...' : ''}
        </span>

        ${hasMore ? `
        <span onclick="openIssueModal('${issue._id}')"
        style="cursor:pointer; color:var(--primary-color); font-weight:600; margin-left:6px;">
        View
        </span>` : ''}
    </div>

    <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">

        <span style="
        font-size:0.85em;
        padding:4px 10px;
        border-radius:12px;
        border:1px solid currentColor;
        background:var(--bg-color);
        color:${statusColor};
        font-weight:600;">
        ${issue.Status}
        </span>

    </div>

    ${issue.AdminResponse ? `
    <div style="margin-top:8px;">
        <span onclick="openIssueModal('${issue._id}')"
        style="
        cursor:pointer;
        font-size:0.95em;
        color:var(--primary-color);
        display:inline-flex;
        align-items:center;
        gap:6px;
        font-weight:600;
        background:var(--bg-color);
        padding:4px 10px;
        border-radius:6px;
        border-left:3px solid var(--primary-color);
        border1px solid var(--card-border);
        ">
            <i class="fa-solid fa-comment"></i> Admin remarks
        </span>
    </div>` : ''}

</div>

`;

        }).join('');

        const totalPages = Math.ceil(filteredStudentIssues.length / ISSUES_PER_PAGE);
        const paginationContainer = document.getElementById('issuesPagination');

        if (totalPages > 1) {

            let paginationHTML = '<div style="display:flex; align-items:center; gap:0.5rem; font-size:0.9em;">';

            paginationHTML += `
            <button onclick="changeIssuesPage(${issuesCurrentPage - 1})"
            class="btn-outline"
            style="padding:0.2rem 0.5rem; border-radius:6px;"
            ${issuesCurrentPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
            </button>`;

            paginationHTML += `
            <span style="font-weight:500; color:var(--text-secondary); padding:0 5px;">
            ${issuesCurrentPage} / ${totalPages}
            </span>`;

            paginationHTML += `
            <button onclick="changeIssuesPage(${issuesCurrentPage + 1})"
            class="btn-outline"
            style="padding:0.2rem 0.5rem; border-radius:6px;"
            ${issuesCurrentPage === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
            </button>`;

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
    const totalPages = Math.ceil(filteredStudentIssues.length / ISSUES_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    issuesCurrentPage = page;
    renderStudentIssues();
}

window.openIssueModal = function(id) {
    const issue = currentIssues.find(i => i._id === id);
    if (!issue) return;

    document.getElementById('issueModalTitle').textContent = issue.IssueTitle;
    document.getElementById('issueModalDate').textContent = new Date(issue.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') + ' | ' + new Date(issue.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const statusEl = document.getElementById('issueModalStatus');
    statusEl.textContent = issue.Status;
    statusEl.style.color = issue.Status === 'Resolved' ? 'var(--success-color)' : (issue.Status === 'In Progress' ? 'var(--warning-color)' : (issue.Status === 'Seen by Admin' ? '#38BDF8' : 'var(--error-color)'));

    document.getElementById('issueModalDesc').textContent = issue.Description || 'No description provided.';

    const replyContainer = document.getElementById('issueModalAdminReplyContainer');
    if (issue.AdminResponse) {
        document.getElementById('issueModalAdminReply').textContent = issue.AdminResponse;
        replyContainer.style.display = 'block';
    } else {
        replyContainer.style.display = 'none';
    }

    document.getElementById('issueModal').style.display = 'block';
}

window.closeIssueModal = function() {
    document.getElementById('issueModal').style.display = 'none';
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
                    .map(([key, val]) => `<span style="background: var(--input-bg); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 5px; color: var(--text-primary); border: 1px solid var(--card-border);">${key}: ${val}</span>`)
                    .join('');
                
                const isLocked = ['Pending', 'Under Review'].includes(req.Status);

                return `
                <div style="border: 1px solid var(--card-border); padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                             ${!isLocked ? `<input type="checkbox" class="request-checkbox" value="${req._id}" onchange="updateBulkDeleteState()">` : '<i class="fa-solid fa-lock" title="Active requests cannot be deleted" style="color: #ccc; width: 13px;"></i>'}
                             <span style="font-size: 0.95em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${req.Status === 'Approved' ? 'var(--success-color)' : (req.Status === 'Rejected' || req.Status === 'Cancelled' ? 'var(--error-color)' : (req.Status === 'Under Review' ? 'var(--primary-color)' : 'var(--warning-color)'))}; font-weight: 600;">
                                ${req.Status}
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size: 0.9em; color: var(--text-secondary);">
                                ${new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 1em; color: var(--text-secondary); margin-bottom: 4px;">Requested Changes:</div>
                        <div>${changes || '<em style="color:#999">No data</em>'}</div>
                    </div>

                    ${req.AdminNote ? `<div style="font-size: 0.95em; background: var(--bg-color); padding: 8px; border-radius: 6px; border: 1px solid var(--card-border); border-left: 3px solid ${req.Status === 'Rejected' || req.Status === 'Cancelled' ? 'var(--error-color)' : 'var(--text-secondary)'}; color: var(--text-primary);"><strong>Note:</strong> ${req.AdminNote}</div>` : ''}
                </div>
            `}).join('');

            // Pagination Controls
            if (data.totalPages > 1) {
                let paginationHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9em;">';
                paginationHTML += `<button onclick="changeRequestsPage(${requestsCurrentPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${requestsCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
                paginationHTML += `<span style="font-weight: 500; color: var(--text-secondary); padding: 0 5px;">${requestsCurrentPage} / ${data.totalPages}</span>`;
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
        showToast("Your account is inactive.", "error");
        return;
    }

    if (ids.length === 0) return;
    if (!await showConfirm(`Are you sure you want to delete ${ids.length} items from your history?`)) return;

    try {
        await apiFetch('/students/profile-requests', { 
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
        loadRequestsHistory();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteProfileRequest(id) {
    if (originalProfileData.AccountStatus === 'Inactive') {
        showToast("Your account is inactive.", "error");
        return;
    }
    if (!await showConfirm('Are you sure you want to delete this item from your history?')) return;
    try {
        await apiFetch(`/students/profile-requests/${id}`, { method: 'DELETE' });
        loadRequestsHistory(); // Refresh the list
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteIssue(id) {
    if (originalProfileData.AccountStatus === 'Inactive') {
        showToast("Your account is inactive.", "error");
        return;
    }
    if (!await showConfirm('Are you sure you want to delete this resolved issue?')) return;
    try {
        await apiFetch('/issues/' + id, { method: 'DELETE' });
        await loadIssues(true);
    } catch (error) {
        showToast('Error deleting issue: ' + error.message, 'error');
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
        showToast('Profile data not loaded yet. Please wait.', 'warning');
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
        showToast("Your account is inactive.", "error");
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
        showToast("Your account is inactive.", "error");
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
        validateFeeForm(); // Reset button state
    } catch (error) {
        msg.style.color = 'red';
        msg.textContent = error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Receipt';
    }
}

window.prepareReupload = function(month) {
    const feeMonthInput = document.getElementById('feeMonth');
    if (feeMonthInput) feeMonthInput.value = month;
    
    if (window.innerWidth <= 768) {
        const container = document.getElementById('feeFormContainer');
        const header = document.querySelector('.mobile-collapse-header');
        if (container && !container.classList.contains('expanded')) {
            container.classList.add('expanded');
            const icon = header.querySelector('i.desktop-hidden');
            if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        }
    }
    
    const fileInput = document.getElementById('feeReceipt');
    if (fileInput) fileInput.click();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    validateFeeForm();
}

async function handleIssueSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('issueSubmitBtn');
    const msg = document.getElementById('issueMsg');

    if (originalProfileData.AccountStatus === 'Inactive') {
        showToast("Your account is inactive.", "error");
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
        validateIssueForm(); // Reset button state
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

let allAnnouncements = [];
let unreadAnnouncements = [];
let readAnnouncements = [];
let currentAnnTab = 'unread';
let unreadPage = 1;
let readPage = 1;
const ANNOUNCEMENTS_PER_PAGE = 5;

async function loadAnnouncements() {
    try {
        const data = await apiFetch('/announcements');
        if (data) {
            allAnnouncements = data;
            processAnnouncements();
        }
    } catch (error) {
        const list = document.getElementById('announcementsListUnread');
        if(list) list.innerHTML = `<p style="color: red;">Error loading announcements: ${error.message}</p>`;
    }
}

function processAnnouncements() {
    const userId = localStorage.getItem('userId');
    const readIds = JSON.parse(localStorage.getItem(`read_announcements_${userId}`)) || [];

    // Sort newest first
    allAnnouncements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    unreadAnnouncements = allAnnouncements.filter(a => !readIds.includes(a._id));
    readAnnouncements = allAnnouncements.filter(a => readIds.includes(a._id));

    // Update Announcement Badges globally
    const unreadCount = unreadAnnouncements.length;
    const badges = document.querySelectorAll('.announcement-badge');
    badges.forEach(badge => {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    });

    renderAnnouncementTab();
}

window.switchAnnouncementTab = function(tab) {
    currentAnnTab = tab;
    
    // Toggle Button Styles
    const btnUnread = document.getElementById('tabBtnUnread');
    const btnRead = document.getElementById('tabBtnRead');
    
    if (tab === 'unread') {
        btnUnread.className = 'btn';
        btnUnread.style.cssText = 'padding: 4px 12px; border-radius: 16px; font-size: 0.95em;';
        btnRead.className = 'btn-outline';
        btnRead.style.cssText = 'padding: 4px 12px; border-radius: 16px; font-size: 0.95em; border: none; color: var(--text-secondary);';
        
        document.getElementById('tabUnreadContent').style.display = 'block';
        document.getElementById('tabReadContent').style.display = 'none';
    } else {
        btnRead.className = 'btn';
        btnRead.style.cssText = 'padding: 4px 12px; border-radius: 16px; font-size: 0.95em;';
        btnUnread.className = 'btn-outline';
        btnUnread.style.cssText = 'padding: 4px 12px; border-radius: 16px; font-size: 0.95em; border: none; color: var(--text-secondary);';
        
        document.getElementById('tabUnreadContent').style.display = 'none';
        document.getElementById('tabReadContent').style.display = 'block';
    }
    renderAnnouncementTab();
}

function renderAnnouncementTab() {
    if (currentAnnTab === 'unread') {
        renderAnnList('announcementsListUnread', 'announcementsPaginationUnread', unreadAnnouncements, unreadPage, true);
    } else {
        renderAnnList('announcementsListRead', 'announcementsPaginationRead', readAnnouncements, readPage, false);
    }
}

function renderAnnList(listId, paginationId, items, page, isUnread) {
    const list = document.getElementById(listId);
    const pagination = document.getElementById(paginationId);
    
    if (!items || items.length === 0) {
        list.innerHTML = `<p style="color: var(--text-secondary); padding: 10px; text-align:center;">No ${isUnread ? 'unread' : 'read'} announcements.</p>`;
        pagination.innerHTML = '';
        return;
    }

    const start = (page - 1) * ANNOUNCEMENTS_PER_PAGE;
    const paginatedItems = items.slice(start, start + ANNOUNCEMENTS_PER_PAGE);

    list.innerHTML = paginatedItems.map(ann => {
        const shortMsg = ann.Message.length > 75 ? ann.Message.substring(0, 75) + '...' : ann.Message;
        return `
        <div style="border-bottom: 1px solid var(--card-border); padding: 15px 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
            <div style="flex: 1;">
                <strong style="font-size: 1.15em; display:block; margin-bottom:4px;">${ann.Title}</strong>
                <p style="margin: 0 0 5px 0; color: var(--text-secondary); font-size: 1em; white-space: pre-wrap;">${shortMsg}</p>
                <span style="font-size: 0.9em; color: #9CA3AF;">
                    ${new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} <span style="margin:0 5px; opacity:0.6">|</span> ${new Date(ann.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                ${ann.ImageURL ? `<span style="margin-left: 10px; font-size: 0.85em; color: var(--primary-color);"><i class="fa-solid fa-image"></i> Attachment</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
                <button onclick="openAnnouncementModal('${ann._id}')" class="btn-outline" style="padding: 6px 12px; font-size: 0.9em; border-radius: 20px;" title="View Full Announcement">
                    <i class="fa-solid fa-eye"></i>
                </button>
                ${isUnread ? `
                <button onclick="markAnnouncementRead('${ann._id}')" class="btn-outline" style="padding: 6px 12px; font-size: 0.9em; border-radius: 20px; color: var(--success-color); border-color: var(--success-color);" title="Mark as Read">
                    <i class="fa-solid fa-check"></i>
                </button>` : ''}
            </div>
        </div>
    `}).join('');

    // Pagination
    const totalPages = Math.ceil(items.length / ANNOUNCEMENTS_PER_PAGE);
    if (totalPages > 1) {
        let html = '';
        html += `<button onclick="changeAnnouncementPage('${isUnread ? 'unread' : 'read'}', ${page - 1})" class="btn-outline" ${page === 1 ? 'disabled' : ''} style="padding: 2px 8px;"><i class="fa-solid fa-chevron-left"></i></button>`;
        html += `<span style="font-size: 0.9em; padding: 0 10px; align-self:center;">${page} / ${totalPages}</span>`;
        html += `<button onclick="changeAnnouncementPage('${isUnread ? 'unread' : 'read'}', ${page + 1})" class="btn-outline" ${page === totalPages ? 'disabled' : ''} style="padding: 2px 8px;"><i class="fa-solid fa-chevron-right"></i></button>`;
        pagination.innerHTML = html;
    } else {
        pagination.innerHTML = '';
    }
}

window.changeAnnouncementPage = function(type, newPage) {
    if (type === 'unread') unreadPage = newPage;
    else readPage = newPage;
    renderAnnouncementTab();
}

window.markAnnouncementRead = function(id) {
    const userId = localStorage.getItem('userId');
    const readIds = JSON.parse(localStorage.getItem(`read_announcements_${userId}`)) || [];
    
    if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`read_announcements_${userId}`, JSON.stringify(readIds));
        showToast('Marked as read', 'success');
        
        // Re-process to update lists and remove the item from unread view immediately
        processAnnouncements();
    }
}

window.openAnnouncementModal = function(id) {
    const ann = allAnnouncements.find(a => a._id === id);
    if (!ann) return;

    document.getElementById('annModalTitle').textContent = ann.Title;
    document.getElementById('annModalDate').textContent = `${new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} | ${new Date(ann.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    document.getElementById('annModalMessage').textContent = ann.Message;
    
    const imgContainer = document.getElementById('annModalImageContainer');
    if (ann.ImageURL) {
        document.getElementById('annModalImage').src = ann.ImageURL;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
    }
    document.getElementById('announcementModal').style.display = 'block';
}

window.closeAnnouncementModal = function() {
    document.getElementById('announcementModal').style.display = 'none';
}

function openImagePreview(url) {
    if (!url) {
        showToast("No image available to preview.", "warning");
        return;
    }
    document.getElementById('previewImageElement').src = url;
    document.getElementById('imagePreviewModal').style.display = 'flex';
}

function closeImagePreview() {
    document.getElementById('imagePreviewModal').style.display = 'none';
    document.getElementById('previewImageElement').src = '';
}

// --- Custom UI Helpers ---
function injectCustomUI() {
    // Toast Container
    if (!document.getElementById('toast-container')) {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
    }
    // Custom Confirm Modal
    if (!document.getElementById('customModalOverlay')) {
        const div = document.createElement('div');
        div.id = 'customModalOverlay';
        div.className = 'custom-modal-overlay';
        div.innerHTML = `
            <div class="custom-box">
                <h3 id="customModalTitle">Confirm</h3>
                <p id="customModalMessage" style="white-space: pre-wrap; margin-bottom: 15px; line-height: 1.4;"></p>
                <div class="custom-actions">
                    <button id="customModalCancel" class="btn btn-cancel">Cancel</button>
                    <button id="customModalConfirm" class="btn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }
}

function showToast(message, type = 'info') { // type: success, error, warning, info
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info" style="color:var(--primary-color)"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color:#10B981"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color:#EF4444"></i>';

    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            ${icon} <span>${message}</span>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        document.getElementById('customModalMessage').textContent = message;
        
        const confirmBtn = document.getElementById('customModalConfirm');
        const cancelBtn = document.getElementById('customModalCancel');

        // Clean up listeners
        const cleanup = () => {
            overlay.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => { cleanup(); resolve(true); };
        cancelBtn.onclick = () => { cleanup(); resolve(false); };

        overlay.classList.add('active');
    });
}

async function promptChangePassword() {
    if (originalProfileData.AccountStatus === 'Inactive') {
        showToast("Your account is inactive. You cannot perform this action.", "error");
        return;
    }
    // Open the HTML modal
    document.getElementById('changePasswordModal').style.display = 'block';
    // Reset Form
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordMsg').textContent = '';
}

function closePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
}

// This needs to be global because it's called via onsubmit in HTML
window.submitChangePassword = async function(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const msg = document.getElementById('passwordMsg');

    if (!newPassword || newPassword.length < 6) {
        msg.style.color = 'red';
        msg.textContent = "New password must be at least 6 characters.";
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

        showToast("Password updated successfully.", "success");
        closePasswordModal();
        // Hide banner after update
        document.getElementById("passwordBanner").style.display = "none";

    } catch (error) {
        msg.style.color = 'red';
        msg.textContent = error.message;
    }
}

async function handleProfilePicUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        if (originalProfileData.AccountStatus === 'Inactive') {
            showToast("Your account is inactive.", "error");
            input.value = '';
            return;
        }

        // Ensure it is an image
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
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
            showToast('Profile picture updated successfully', 'success');
            closeCropModal();
            loadProfile(); // Refresh profile section
            document.getElementById('navProfilePic').src = data.profilePictureURL; // Update nav bar
        } catch (error) {
            showToast('Failed to update profile picture: ' + error.message, 'error');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }, 'image/png');
}

async function handleAadharUpload(input) {
    if (input.files && input.files[0]) {
        if (originalProfileData.AccountStatus === 'Inactive') {
            showToast("Your account is inactive.", "error");
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
            showToast('Aadhar proof uploaded successfully! Please wait for admin verification.', 'success');
            loadProfile(); // Refresh to show pending status
        } catch (error) {
            showToast('Failed to update Aadhar proof: ' + error.message, 'error');
        }
    }
}

// --- Notifications / Messages Logic ---
async function fetchNotificationCount() {
    try {
        const notifications = await apiFetch('/students/notifications');
        const unreadCount = notifications.filter(n => !n.IsRead).length;
        const badges = document.querySelectorAll('.notification-badge');
        badges.forEach(badge => {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
        });
    } catch (error) {
        console.error('Error fetching notification count:', error);
    }
}

let currentNotifications = [];
let notificationsCurrentPage = 1;
const NOTIFICATIONS_PER_PAGE = 3;

async function loadNotifications() {
    const list = document.getElementById('notificationsList');
    const paginationContainer = document.getElementById('notificationsPagination');
    if (!list) return;
    list.innerHTML = 'Loading messages...';
    if (paginationContainer) paginationContainer.innerHTML = '';
    try {
        const notifications = await apiFetch('/students/notifications');
        if (notifications && notifications.length > 0) {
            currentNotifications = notifications;
            notificationsCurrentPage = 1;
            renderNotifications();
        } else {
            list.innerHTML = '<p style="color: var(--text-secondary);">No messages from Admin.</p>';
        }
    } catch (error) {
        list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    const paginationContainer = document.getElementById('notificationsPagination');

    const startIndex = (notificationsCurrentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const endIndex = startIndex + NOTIFICATIONS_PER_PAGE;
    const msgsToShow = currentNotifications.slice(startIndex, endIndex);

    list.innerHTML = msgsToShow.map(n => `
        <div style="border-left: 4px solid ${n.IsRead ? 'transparent' : 'var(--primary-color)'}; padding: 15px; margin-bottom: 10px; border-radius: 8px; background: var(--input-bg); border-top: 1px solid var(--card-border); border-right: 1px solid var(--card-border); border-bottom: 1px solid var(--card-border);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <strong style="${n.IsRead ? 'color: var(--text-primary);' : 'color: var(--primary-color);'}"><i class="fa-solid fa-envelope" style="margin-right:5px;"></i> ${n.Title}</strong>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <span style="font-size:0.85em; color:var(--text-secondary);">${new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} | ${new Date(n.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    <div style="display: flex; gap: 5px;">
                        ${!n.IsRead ? `<button onclick="markNotificationRead('${n._id}')" class="btn-outline" style="padding: 2px 8px; font-size: 0.8em; border-radius: 4px; color: var(--success-color); border-color: var(--success-color);"><i class="fa-solid fa-check"></i> Mark Read</button>` : ''}
                        <button onclick="deleteAdminMessage('${n._id}')" class="btn-outline" style="padding: 2px 8px; font-size: 0.8em; border-radius: 4px; color: var(--error-color); border-color: var(--error-color);"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
            <div style="font-size:0.95em; color:var(--text-secondary); white-space:pre-wrap; word-break: break-word;">${n.Message}</div>
        </div>
    `).join('');

    const totalPages = Math.ceil(currentNotifications.length / NOTIFICATIONS_PER_PAGE);
    if (totalPages > 1) {
        let paginationHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9em;">';
        paginationHTML += `<button onclick="changeNotificationsPage(${notificationsCurrentPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${notificationsCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
        paginationHTML += `<span style="font-weight: 500; color: var(--text-secondary); padding: 0 5px;">${notificationsCurrentPage} / ${totalPages}</span>`;
        paginationHTML += `<button onclick="changeNotificationsPage(${notificationsCurrentPage + 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${notificationsCurrentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
        paginationHTML += '</div>';
        if (paginationContainer) paginationContainer.innerHTML = paginationHTML;
    } else {
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
}

function changeNotificationsPage(page) {
    const totalPages = Math.ceil(currentNotifications.length / NOTIFICATIONS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    notificationsCurrentPage = page;
    renderNotifications();
}

async function markNotificationsAsRead() {
    markAllNotificationsRead();
}

async function markAllNotificationsRead() {
    try {
        await apiFetch('/students/notifications/read', { 
            method: 'PUT',
            body: JSON.stringify({})
        });
        currentNotifications.forEach(n => n.IsRead = true);
        renderNotifications();
        fetchNotificationCount();
    } catch (error) {
        showToast('Error marking all as read: ' + error.message, 'error');
    }
}

async function markNotificationRead(id) {
    try {
        await apiFetch('/students/notifications/read', {
            method: 'PUT',
            body: JSON.stringify({ id })
        });
        const notification = currentNotifications.find(n => n._id === id);
        if (notification) notification.IsRead = true;
        renderNotifications();
        fetchNotificationCount();
    } catch (error) {
        showToast('Error marking message as read: ' + error.message, 'error');
    }
}

async function deleteAdminMessage(id) {
    if (!await showConfirm('Are you sure you want to delete this message?')) return;
    try {
        await apiFetch('/students/notifications/' + id, { method: 'DELETE' });
        showToast('Message deleted', 'success');
        loadNotifications(); // Refresh list
        fetchNotificationCount(); // Update unread count if deleted an unread message
    } catch (error) {
        showToast('Error deleting message: ' + error.message, 'error');
    }
}

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

// --- Push Notification Setup ---
// Converts the Base64 VAPID key into a format the browser Push API requires
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPushNotifications() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();
                
                if (!subscription) {
                    const { publicKey } = await apiFetch('/students/vapid-public-key');
                    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    });
                }
                
                await apiFetch('/students/subscribe', {
                    method: 'POST',
                    body: JSON.stringify(subscription)
                });
            }
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
        }
    }
}