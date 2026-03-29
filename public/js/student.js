// Fees History: FEES_PER_PAGE
// Student Issues: ISSUES_PER_PAGE
// Profile Update Requests: REQUESTS_PER_PAGE
// Announcements: ANNOUNCEMENTS_PER_PAGE
// Admin Messages: MESSAGES_PER_PAGE



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
        
        // Fetch fees to display Next Due Date next to name
        const headerFees = await apiFetch('/fees/status').catch(() => []);
        const joinDateHeader = new Date(profile.JoiningDate || profile.createdAt || new Date());
        let iterDateHeader = new Date(joinDateHeader.getFullYear(), joinDateHeader.getMonth(), 1);
        const planDurationHeader = profile.planDuration || 'Monthly';
        let monthIncHeader = 1;
        if (planDurationHeader === 'Quarterly') monthIncHeader = 3;
        else if (planDurationHeader === 'Half-Yearly') monthIncHeader = 6;
        else if (planDurationHeader === 'Yearly') monthIncHeader = 12;
        const maxIterDateHeader = new Date(new Date().getFullYear() + 5, new Date().getMonth(), 1);
        let nextDueMonthHeader = 'N/A';
        let dueMonthNamePlain = '';
        let isPendingReview = false;

        while (iterDateHeader <= maxIterDateHeader) {
            const monthName = iterDateHeader.toLocaleString('en-US', { month: 'long', year: 'numeric' }).replace(/\s+/g, ' ').trim();
            
            const monthFees = headerFees.filter(f => f.Month && f.Month.toLowerCase() === monthName.toLowerCase());
            let feeRecord = null;
            if (monthFees.length > 0) {
                feeRecord = monthFees.find(f => f.Status === 'Paid' || f.Status === 'Approved') || 
                            monthFees.find(f => f.Status === 'Pending') || 
                            monthFees[0];
            }

            if (!feeRecord || (feeRecord.Status !== 'Paid' && feeRecord.Status !== 'Approved')) {
                dueMonthNamePlain = monthName;
                if (feeRecord && feeRecord.Status === 'Pending') {
                    isPendingReview = true;
                    nextDueMonthHeader = `${monthName} <span style="color: var(--warning-color);" title="Pending"><i class="fa-solid fa-clock"></i></span>`;
                }
                else nextDueMonthHeader = monthName;
                break;
            }
            iterDateHeader.setMonth(iterDateHeader.getMonth() + monthIncHeader);
        }

        document.getElementById('studentName').innerHTML = `${firstName} <span style="font-size: 0.5em; font-weight: 600; background: var(--bg-color); border: 1px solid var(--card-border); color: var(--text-secondary); padding: 4px 10px; border-radius: 12px; margin-left: 10px; vertical-align: middle; letter-spacing: normal; text-transform: none; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-calendar-check" style="color: var(--primary-color);"></i> Due: <span style="color: var(--text-primary);">${nextDueMonthHeader}</span></span>`;

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

        // Auto-fill Next Due Month in Fee Form
        const globalFeeMonthField = document.getElementById('feeMonth');
        if (globalFeeMonthField && iterDateHeader) {
            const y = iterDateHeader.getFullYear();
            const m = String(iterDateHeader.getMonth() + 1).padStart(2, '0');
            globalFeeMonthField.value = `${y}-${m}`;
            if (typeof validateFeeForm === 'function') validateFeeForm();
        }

        // Update Plan in header
        const planText = profile.planDuration
            ? `${profile.planDuration} (${profile.batchType || 'N/A'}) | ${profile.assignedHall || 'N/A'}_${profile.SeatNo || 'N/A'}`
            : 'N/A';
        document.getElementById('studentPlan').innerHTML = `<i class="fa-solid fa-clock" style="margin-right: 5px;"></i>${planText} &nbsp;&nbsp;`;

        // Update joining date in header
        if (profile.JoiningDate) {
            document.getElementById('studentJoinDate').innerHTML = `
            <i class="fa-solid fa-calendar-days" style="margin-right: 5px;"></i> 
            ${new Date(profile.JoiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')}`;
        }

        // Save name to localStorage for future use (e.g., if profile fetch fails next time)
        localStorage.setItem('name', profile.FullName || 'Student');

        // Prompt for Push Notifications slightly after loading so it isn't aggressive
        setTimeout(() => {
            subscribeToPushNotifications();
            if (typeof checkPushStatus === 'function') checkPushStatus();
        }, 2000); 

        // Auto-prompt for fee upload if due within 3 days
        if (dueMonthNamePlain && !isPendingReview && !sessionStorage.getItem('feePromptShown')) {
            const dueDate = new Date(iterDateHeader.getFullYear(), iterDateHeader.getMonth(), joinDateHeader.getDate());
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            dueDate.setHours(0, 0, 0, 0);
            
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3) {
                sessionStorage.setItem('feePromptShown', 'true');
                
                setTimeout(() => {
                    const daysText = diffDays < 0 ? 'is overdue!' : (diffDays === 0 ? 'is due today!' : `is due in ${diffDays} days!`);
                    showToast(`Reminder: Your fee for ${dueMonthNamePlain} ${daysText} Please upload your receipt.`, 'warning');
                    
                    window.location.hash = '#fees';
                    
                    setTimeout(() => {
                        const feeMonthInput = document.getElementById('feeMonth');
                        if (feeMonthInput) {
                            const y = iterDateHeader.getFullYear();
                            const m = String(iterDateHeader.getMonth() + 1).padStart(2, '0');
                            feeMonthInput.value = `${y}-${m}`;
                        }

                        if (window.innerWidth <= 768) {
                            const container = document.getElementById('feeFormContainer');
                            if (container && !container.classList.contains('expanded')) {
                                container.classList.add('expanded');
                            }
                        }

                        const feeFormContainer = document.getElementById('feeFormContainer') || document.getElementById('feeForm');
                        if (feeFormContainer) {
                            feeFormContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            feeFormContainer.style.transition = 'box-shadow 0.5s ease-in-out, transform 0.5s ease-in-out';
                            feeFormContainer.style.boxShadow = '0 0 20px var(--warning-color)';
                            feeFormContainer.style.transform = 'scale(1.02)';
                            setTimeout(() => {
                                feeFormContainer.style.boxShadow = '';
                                feeFormContainer.style.transform = 'scale(1)';
                                validateFeeForm();
                            }, 1500);
                        }
                    }, 300); // Wait for tab switch rendering
                }, 2500); // Trigger 2.5 seconds after app load
            }
        }
        
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
    
    if (typeof checkPushStatus === 'function') checkPushStatus();
});

function validateFeeForm() {
    const feeMonth = document.getElementById('feeMonth');
    const feeReceipt = document.getElementById('feeReceipt');
    const feeSubmitBtn = document.getElementById('feeSubmitBtn');
    const feeMsg = document.getElementById('feeMsg');

    if (feeMonth && feeReceipt && feeSubmitBtn) {
        const rawMonth = feeMonth.value;
        let enteredMonth = '';
        if (rawMonth) {
            const [y, m] = rawMonth.split('-');
            const date = new Date(y, m - 1);
            enteredMonth = date.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        }
        let isDuplicate = false;

        // Dynamic validation against history
        if (enteredMonth && currentFees) {
            const monthFees = currentFees.filter(f => f.Month && f.Month.toLowerCase() === enteredMonth);
            let existing = null;
            if (monthFees.length > 0) {
                existing = monthFees.find(f => f.Status === 'Paid' || f.Status === 'Approved') || 
                           monthFees.find(f => f.Status === 'Pending') || 
                           monthFees[0];
            }
            if (existing) {
                if (existing.Status === 'Paid' || existing.Status === 'Approved') {
                    if (feeMsg) { feeMsg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success-color); color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Fee for <strong>${existing.Month}</strong> is already Paid.</div>`; }
                    isDuplicate = true;
                } else if (existing.Status === 'Pending') {
                    if (feeMsg) { feeMsg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--warning-color); color: var(--warning-color); font-weight: 500;"><i class="fa-solid fa-clock"></i> Receipt for <strong>${existing.Month}</strong> is currently under review.</div>`; }
                    isDuplicate = true;
                } else if (feeMsg && (feeMsg.innerHTML.includes('already Paid') || feeMsg.innerHTML.includes('under review'))) {
                    feeMsg.innerHTML = ''; // Clear message because it's 'Rejected', so they CAN re-upload
                }
            } else if (feeMsg && (feeMsg.innerHTML.includes('already Paid') || feeMsg.innerHTML.includes('under review'))) {
                feeMsg.innerHTML = ''; // Clear message
            }
        }

        if (rawMonth !== '' && feeReceipt.files.length > 0 && !isDuplicate) {
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
    if (hash === '#attendance-history') loadAttendanceHistory();
}

async function loadProfile() {
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = 'Loading...';
    try {
        const data = await apiFetch('/students/profile');
            const wifiData = await apiFetch('/config/wifi').catch(() => ({
                // Fallback in case of an error

                hall1: { title: "Hall 01", network: "Knowledge Nook Library H1", password: "jio@1234" },
                hall2: { title: "Hall 02 + Premium Rooms", network: "Airtel_KNLibrary", password: "Air73411" }
            }));
        const attData = await apiFetch('/students/attendance/today').catch(() => null);
        currentFees = await apiFetch('/fees/status').catch(() => []); // Fetch fees to calculate due date
        originalProfileData = data; // Keep a copy for the update modal

        // Calculate Next Due Month
        const joinDate = new Date(data.JoiningDate || data.createdAt || new Date());
        let iterDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
        
        const planDuration = data.planDuration || 'Monthly';
        let monthIncrement = 1;
        if (planDuration === 'Quarterly') monthIncrement = 3;
        else if (planDuration === 'Half-Yearly') monthIncrement = 6;
        else if (planDuration === 'Yearly') monthIncrement = 12;

        const currentDate = new Date();
        const maxIterDate = new Date(currentDate.getFullYear() + 5, currentDate.getMonth(), 1); // Look ahead up to 5 years
        let nextDueMonth = 'N/A';

        while (iterDate <= maxIterDate) {
            const monthName = iterDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).replace(/\s+/g, ' ').trim();
            
            const monthFees = currentFees.filter(f => f.Month && f.Month.toLowerCase() === monthName.toLowerCase());
            let feeRecord = null;
            if (monthFees.length > 0) {
                feeRecord = monthFees.find(f => f.Status === 'Paid' || f.Status === 'Approved') || 
                            monthFees.find(f => f.Status === 'Pending') || 
                            monthFees[0];
            }
            
            if (!feeRecord || (feeRecord.Status !== 'Paid' && feeRecord.Status !== 'Approved')) {
                if (feeRecord && feeRecord.Status === 'Pending') nextDueMonth = `${monthName} <span style="color: var(--warning-color);" title="Pending"><i class="fa-solid fa-clock"></i></span>`;
                else nextDueMonth = monthName;
                break;
            }
            iterDate.setMonth(iterDate.getMonth() + monthIncrement);
        }

        // Keep header synced when they navigate to Profile tab
        const firstName = data.FullName ? data.FullName.split(' ')[0] : 'Student';
        const studentNameEl = document.getElementById('studentName');
        if (studentNameEl) {
            studentNameEl.innerHTML = `${firstName} <span style="font-size: 0.5em; font-weight: 600; background: var(--bg-color); border: 1px solid var(--card-border); color: var(--text-secondary); padding: 4px 10px; border-radius: 12px; margin-left: 10px; vertical-align: middle; letter-spacing: normal; text-transform: none; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-calendar-check" style="color: var(--primary-color);"></i> Due: <span style="color: var(--text-primary);">${nextDueMonth}</span></span>`;
        }

        // Auto-fill Fee Month
        const profileFeeMonthField = document.getElementById('feeMonth');
        if (profileFeeMonthField && iterDate) {
            const y = iterDate.getFullYear();
            const m = String(iterDate.getMonth() + 1).padStart(2, '0');
            profileFeeMonthField.value = `${y}-${m}`;
            if (typeof validateFeeForm === 'function') validateFeeForm();
        }

        let elapsedHrsText = '00:00 hrs';
        if (attData) {
            if (attData.TotalHours) {
                elapsedHrsText = String(Math.floor(Math.round(attData.TotalHours * 60) / 60)).padStart(2, '0') + ':' + String(Math.round(attData.TotalHours * 60) % 60).padStart(2, '0') + ' hrs';
            } else if (attData.CheckInTime) {
                const diffMins = Math.floor((new Date() - new Date(attData.CheckInTime)) / 60000);
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                elapsedHrsText = String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ' hrs';
            }
        }

        profileContent.innerHTML = `
            <div class="grid-2" style="gap: 1.5rem; margin-top: 1rem;">
                <!-- Status Container Placeholder -->
                <div id="profileRequestStatusContainer" style="grid-column: 1 / -1; display:none;"></div>

            <!-- Today's Attendance Widget -->
            ${attData ? `
            <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border); grid-column: 1 / -1; margin-top: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-clock" style="color:var(--primary-color);"></i> Today's Attendance (${attData.DateString.split('-').reverse().join('-')})</div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="reportAttendanceIssue()" class="btn-outline" style="padding: 4px 10px; font-size: 0.85em; border-radius: 6px; color: var(--warning-color); border-color: var(--warning-color);" title="Report Issue"><i class="fa-solid fa-triangle-exclamation"></i> Issue</button>
                        <button onclick="window.location.hash='#attendance-history'" class="btn-outline" style="padding: 4px 12px; font-size: 0.85em; border-radius: 6px;"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; text-align: center; gap: 10px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 80px; background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--card-border);">
                        <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">In</div>
                        <div style="font-weight: 600; color: var(--success-color);">${new Date(attData.CheckInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div style="flex: 1; min-width: 80px; background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--card-border);">
                        <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Out</div>
                        <div style="font-weight: 600; color: var(--error-color);">${attData.CheckOutTime ? new Date(attData.CheckOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</div>
                    </div>
                    <div style="flex: 1; min-width: 80px; background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--card-border);">
                        <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Total Hrs</div>
                        <div style="font-weight: 600; color: var(--primary-color);">${elapsedHrsText}</div>
                    </div>
                </div>
            </div>` : `
            <div style="padding: 1.25rem; border-radius: 12px; border: 1px solid var(--success); grid-column: 1 / -1; margin-top: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-clock" style="color:var(--primary-color);"></i> Today's Attendance</div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="reportAttendanceIssue()" class="btn-outline" style="padding: 4px 10px; font-size: 0.85em; border-radius: 6px; color: var(--warning-color); border-color: var(--warning-color);" title="Missed Check-In?"><i class="fa-solid fa-triangle-exclamation"></i> Missed?</button>
                        <button onclick="window.location.hash='#attendance-history'" class="btn-outline" style="padding: 4px 12px; font-size: 0.85em; border-radius: 6px;"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
                    </div>
                </div>
                <div style="color: var(--text-secondary); font-size: 1em; text-align: center;">You have not mark <b><u style="color: var(--primary-color);">Today Attendance</u></b></div>
            </div>
            `}

                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-user" style="color:var(--primary-color); font-size:0.9em;"></i> Name</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.FullName}</div>
                </div>

                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-cake-candles" style="color:var(--primary-color); font-size:0.9em;"></i> Date of Birth</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;"> 
                       ${data.DOB 
                        ? new Date(data.DOB)
                            .toLocaleDateString('en-GB',{
                                day:'2-digit',
                                month:'long',
                                year:'numeric'
                            })
                            .replace(/ /g,'-')
                             : 'N/A'}
                    </div>
                </div>

                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-envelope" style="color:var(--primary-color); font-size:0.9em;"></i> Email</div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px; gap: 10px; flex-wrap: wrap;">
                        <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; word-break: break-all;">${data.Email}</div>
                        <span id="emailVerifyContainer">
                            ${data.isEmailVerified 
                                ? `<span style="color: var(--success-color); font-size: 0.9em; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-circle-check"></i> Verified</span>` 
                                : `<!-- <button id="emailVerifyBtn" class="btn" style="padding: 4px 12px; font-size: 0.85em; border-radius: 6px;" onclick="openEmailOtpModal()">Verify</button> -->`
                            }
                        </span>
                    </div>
                </div>
                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-phone" style="color:var(--primary-color); font-size:0.9em;"></i> Phone</div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px; gap: 10px; flex-wrap: wrap;">
                        <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; word-break: break-all;">${data.Contact}</div>
                        <span id="phoneVerifyContainer">
                            ${data.isContactVerified 
                                ? `<span style="color: var(--success-color); font-size: 0.9em; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-circle-check"></i> Verified</span>` 
                                : `<!-- <button id="phoneVerifyBtn" class="btn" style="padding: 4px 12px; font-size: 0.85em; border-radius: 6px;" onclick="openPhoneOtpModal()">Verify</button> -->`
                            }
                        </span>
                    </div>
                </div>
                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
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
                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border); grid-column: 1 / -1;">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-location-dot" style="color:var(--primary-color); font-size:0.9em;"></i> Address</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">${data.FullAddress}</div>
                </div>
                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-id-card" style="color:var(--primary-color); font-size:0.9em;"></i> Status</div>
                    <div style="font-size: 1.2em; margin-top: 5px;">
                        <span style="padding: 4px 10px; border-radius: 12px; font-size: 0.95em; border: 1px solid currentColor; background: var(--bg-color); color: ${data.AccountStatus === 'Active' ? 'var(--success-color)' : 'var(--warning-color)'}; font-weight: 600;">
                            ${data.AccountStatus}
                        </span>
                    </div>
                </div>
                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border);">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"><i class="fa-solid fa-chair" style="color:var(--primary-color); font-size:0.9em;"></i> Seat No</div>
                    <div style="font-size: 1.2em; color: var(--text-primary); font-weight: 500; margin-top: 5px;">
                    ${data.assignedHall || 'N/A'}_${data.SeatNo || 'N/A'}
                    </div>
                </div>

                <!-- Wi-Fi Details Hub -->
                <div style=" padding: 1.25rem; border-radius: 12px; border: 1px solid var(--card-border); grid-column: 1 / -1;">
                    <div style="font-size: 0.95em; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 15px;">
                        <i class="fa-solid fa-wifi" style="color:var(--primary-color); font-size:0.9em;"></i> Library Wi-Fi Access
                    </div>
                    ${data.AccountStatus === 'Active' ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                        <!-- Hall 01 -->

                        <div style="border: 1px solid var(--card-border); padding: 15px; border-radius: 8px; background: var(--bg-color);">

                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 10px;"><i class="fa-solid fa-network-wired"></i> ${wifiData.hall1.title || 'Hall 01'}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px;">
                                <span style="font-size: 0.9em; color: var(--text-secondary);">Network:</span>
                                <div style="display: flex; align-items: center; gap: 8px;  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--card-border);">
                                    <strong style="font-size: 0.95em; user-select: all;">${wifiData.hall1.network}</strong>
                                    <i class="fa-regular fa-copy" style="cursor: pointer; color: var(--primary-color);" onclick="copyToClipboard('${wifiData.hall1.network}')" title="Copy Network Name"></i>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px;">
                                <span style="font-size: 0.9em; color: var(--text-secondary);">Password:</span>
                                <div style="display: flex; align-items: center; gap: 8px;  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--card-border);">
                                    <strong style="font-size: 0.95em; letter-spacing: 1px; user-select: all;">${wifiData.hall1.password}</strong>
                                    <i class="fa-regular fa-copy" style="cursor: pointer; color: var(--primary-color);" onclick="copyToClipboard('${wifiData.hall1.password}')" title="Copy Password"></i>
                                </div>
                            </div>
                        </div>
                        <!-- Hall 02 + Premium Rooms -->
                        <div style="border: 1px solid var(--card-border); padding: 15px; border-radius: 8px; background: var(--bg-color);">

                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 10px;"><i class="fa-solid fa-star" style="color: #F59E0B;"></i> ${wifiData.hall2.title || 'Hall 02 + Premium Rooms'}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px;">
                                <span style="font-size: 0.9em; color: var(--text-secondary);">Network:</span>
                                <div style="display: flex; align-items: center; gap: 8px;  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--card-border);">
                                    <strong style="font-size: 0.95em; user-select: all;">${wifiData.hall2.network}</strong>
                                    <i class="fa-regular fa-copy" style="cursor: pointer; color: var(--primary-color);" onclick="copyToClipboard('${wifiData.hall2.network}')" title="Copy Network Name"></i>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px;">
                                <span style="font-size: 0.9em; color: var(--text-secondary);">Password:</span>
                                <div style="display: flex; align-items: center; gap: 8px;  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--card-border);">
                                    <strong style="font-size: 0.95em; letter-spacing: 1px; user-select: all;">${wifiData.hall2.password}</strong>
                                    <i class="fa-regular fa-copy" style="cursor: pointer; color: var(--primary-color);" onclick="copyToClipboard('${wifiData.hall2.password}')" title="Copy Password"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div style="padding: 15px; background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning-color); border-radius: 6px; color: var(--text-primary); font-size: 0.95em;">
                        <i class="fa-solid fa-lock" style="color: var(--warning-color); margin-right: 5px;"></i> Wi-Fi details are securely hidden and only visible to <strong>Active</strong> members.
                    </div>
                    `}
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
                        <span style="font-size: 0.9em; color: var(--text-secondary);">${new Date(request.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')}</span>
                    </div>`;
            } else if (request.Status === 'Approved') {
                bannerHTML = `
                    <div style="background: var(--bg-color); border: 1px solid var(--success-color); border-left: 4px solid var(--success-color); padding: 15px; border-radius: 8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-weight: 600; color: var(--success-color); margin-bottom: 4px;"><i class="fa-solid fa-check-circle"></i> Profile Update Approved</div>
                            <button onclick="dismissRequestNotification('${request._id}')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color: var(--success-color);">&times;</button>
                        </div>
                        <p style="font-size: 1em; color: var(--text-secondary);">Your profile has been successfully updated with the requested changes.</p>
                        ${request.AdminNote ? `<div style="font-size: 0.9em; margin-top: 5px; color: var(--text-primary);"><strong>Note:</strong> ${request.AdminNote}</div>` : ''}
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

        list.innerHTML = feesToShow.map(fee => {
            let displayMonth = fee.Month.charAt(0).toUpperCase() + fee.Month.slice(1);
            const plan = originalProfileData.planDuration || 'Monthly';
            let monthInc = 1;
            if (plan === 'Quarterly') monthInc = 3;
            else if (plan === 'Half-Yearly') monthInc = 6;
            else if (plan === 'Yearly') monthInc = 12;

            if (monthInc > 1) {
                const d = new Date(fee.Month);
                if (!isNaN(d.getTime())) {
                    const dEnd = new Date(d.getFullYear(), d.getMonth() + monthInc - 1, 1);
                    const startStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    const endStr = dEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    displayMonth = `${startStr} to ${endStr}`;
                }
            }

            let adminNoteHtml = '';
            if (fee.AdminNote) {
                if (fee.AdminNote.includes('|')) {
                    const parts = fee.AdminNote.split('|');
                    const txnId = (parts[0] || '').replace(/Txn ID:/i, '').trim();
                    const date = (parts[1] || '').replace(/Date:/i, '').trim();
                    adminNoteHtml = `<div><strong>Txn ID:</strong> ${txnId}</div><div><strong>Date:</strong> ${date}</div>`;
                } else {
                    adminNoteHtml = `<div><strong>Note:</strong> ${fee.AdminNote}</div>`;
                }
            }
            
            return `
            <div style="border-bottom: 2px solid black; padding: 10px; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong>${displayMonth}</strong>
                        ${fee.isResubmitted && fee.Status === 'Pending' ? `<span style="font-size: 0.75em; padding: 2px 8px; border-radius: 12px; background: var(--primary-light); color: var(--primary-color); font-weight: 600;"><i class="fa-solid fa-rotate-right"></i> Resubmitted</span>` : ''}
                    </div>

   

                    <div style="font-size: 0.95em; color: var(--text-secondary); margin-top: 4px;">
                    
                    ${new Date(fee.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')}
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

                    ${(fee.Status === 'Paid' || fee.Status === 'Approved') ? `
                    <div style="margin-top:8px;">
                        <span onclick="const el = document.getElementById('stu-details-${fee._id}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; font-size: 0.85em; color: var(--success-color); display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                            <i class="fa-solid fa-circle-info"></i> Payment Details
                        </span>
                        <div id="stu-details-${fee._id}" style="display: none; margin-top: 5px; background:var(--bg-color); padding:10px 12px; border-left:3px solid var(--success-color); border-radius:6px; font-size:0.9em; color:var(--text-primary); line-height: 1.5;">
                            ${fee.Amount ? `<div><strong>Amount:</strong> ₹${fee.Amount}</div>` : ''}
                            ${fee.ReceiptNo ? `<div><strong>Receipt No:</strong> <span style="font-family: monospace;">${fee.ReceiptNo}</span></div>` : ''}
                            ${adminNoteHtml}
                        </div>
                    </div>` : ''}

                </div>

                <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                    <span style="font-size: 0.95em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${fee.Status === 'Approved' || fee.Status === 'Paid'
                ? 'var(--success-color)'
                : (fee.Status === 'Pending' ? 'var(--warning-color)' : 'var(--error-color)')
            }; font-weight: 600;">
                        ${fee.Status}
                    </span>

                    ${(fee.Status === 'Paid' || fee.Status === 'Approved') ? `
                        <button onclick="downloadReceipt('${fee._id}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.85em; border-color: var(--success-color); color: var(--success-color); border-radius: 6px;" title="Download PDF Receipt">
                            <i class="fa-solid fa-file-pdf"></i> Receipt
                        </button>
                    ` : ''}

                    ${fee.ProofImageURL && fee.ProofImageURL !== 'N/A' ? `
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
        `}).join('');

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

window.downloadReceipt = async function (feeId) {
    const fee = currentFees.find(f => f._id === feeId);
    if (!fee) return showToast('Fee record not found', 'error');

    const student        = originalProfileData || {};
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
  <div style="text-align:center;margin-bottom:4px;">
    <div style="font-size:26px;font-weight:900;color:#1a0a0a;letter-spacing:1px;line-height:1.1;font-family:'Arial Black',Arial,sans-serif;">KNOWLEDGE NOOK LIBRARY</div>
    <div style="font-size:11px;font-weight:700;color:#333;margin-top:3px;letter-spacing:0.3px;">B.M.P.-16, NEAR PNB BANK, PHULWARI SHARIF, PATNA</div>
    <div style="font-size:11px;font-weight:600;color:#333;margin-top:1px;">Director : ROHIT KUMAR</div>
  </div>
  <div style="border-top:2px solid #333;border-bottom:1px solid #333;margin:10px 0;height:3px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
    <div style="font-size:13px;font-weight:700;color:#222;">
      No. &nbsp;<span style="font-size:18px;font-weight:900;font-family:'Arial Black',Arial;">${receiptNo}</span>
    </div>
    <div style="font-size:13px;font-weight:700;color:#222;">
      Date: <span style="font-size:15px;font-weight:900;border-bottom:1px solid #555;padding-bottom:1px;">${paymentDate !== 'N/A' ? paymentDate : generatedOn}</span>
    </div>
  </div>
  <div style="margin-bottom:12px;border-bottom:1px dotted #888;padding-bottom:8px;">
    <span style="font-size:12px;font-weight:700;color:#333;">Name of Candidate........</span>
    <span style="font-size:15px;font-weight:900;color:#1a0a0a;font-family:'Arial Black',Arial;letter-spacing:0.3px;">${studentName}</span>
  </div>
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
      <span style="font-weight:900;color:#1a0a0a;">${displayMonth}</span>
    </div>
  </div>
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
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:72px;height:72px;border:3px solid #1a0a0a;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fce8e8;">
        <div style="font-size:16px;font-weight:900;color:#1a0a0a;">&#8377;</div>
        <div style="font-size:17px;font-weight:900;color:#1a0a0a;line-height:1;">${fee.Amount}</div>
      </div>
    </div>
    <div style="text-align:center;flex:1;padding:0 12px;">
      <div style="font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Transaction ID</div>
      <div style="font-size:12px;font-weight:900;color:#1a0a0a;font-family:monospace;">${txnId}</div>
      <div style="font-size:10px;color:#555;margin-top:4px;">Plan: ${planDuration}</div>
    </div>
    <div style="text-align:center;min-width:80px;">
      <div style="border-top:1px solid #333;padding-top:4px;font-size:11px;font-weight:700;color:#333;">-Signature</div>
    </div>
  </div>
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
            if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
                document.body.removeChild(captureWrap);
                document.body.removeChild(overlay);
                return showToast('Receipt generation libraries not loaded!', 'error');
            }
            html2canvas(receiptDiv, { scale: 2, useCORS: true, backgroundColor: '#EE959E', width: rW, height: rH }).then(rawCanvas => {
                document.body.removeChild(captureWrap);
                const imgData = rawCanvas.toDataURL('image/jpeg', 0.93);
                const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                const pageW = 210, pageH = 297, margin = 10;
                let imgW = pageW - margin * 2; let imgH = (rawCanvas.height * imgW) / rawCanvas.width;
                if (imgH > pageH - margin * 2) { imgH = pageH - margin * 2; imgW = (rawCanvas.width * imgH) / rawCanvas.height; }
                pdf.addImage(imgData, 'JPEG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);
                pdf.save(`KNL_Receipt_${studentName.replace(/\s+/g,'_')}_${feeMonth.replace(/\s+/g,'_')}.pdf`);
                document.body.removeChild(overlay);
                                
                // Ping backend to track the download
                apiFetch(`/fees/${feeId}/track-download`, { method: 'POST' }).catch(e => console.error('Tracking failed', e));
                

                showToast('Receipt downloaded! ✓', 'success');
            }).catch(() => {
                document.body.removeChild(captureWrap); document.body.removeChild(overlay);
                showToast('Failed to generate receipt', 'error');
            });
        }));
    }, 800);
};

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
            .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
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
    document.getElementById('issueModalDate').textContent = new Date(issue.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-') + ' | ' + new Date(issue.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
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
let REQUESTS_PER_PAGE = 10;

window.changeRequestsLimit = function() {
    REQUESTS_PER_PAGE = document.getElementById('filterRequestPerPage').value;
    requestsCurrentPage = 1;
    loadRequestsHistory();
}

window.filterRequests = function() {
    requestsCurrentPage = 1;
    loadRequestsHistory();
}

async function loadRequestsHistory() {
    const list = document.getElementById('requestsHistoryList');
    const paginationContainer = document.getElementById('requestsPagination');
    const actionsContainer = document.getElementById('requestsActions');
    const selectAllCheckbox = document.getElementById('selectAllRequests');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const statusFilter = document.getElementById('filterRequestStatus') ? document.getElementById('filterRequestStatus').value : '';
    
    list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading history...</td></tr>';
    paginationContainer.innerHTML = '';
    actionsContainer.style.display = 'none';
    selectAllCheckbox.checked = false;
    bulkDeleteBtn.disabled = true;

    try {
        let url = `/students/profile-requests?page=${requestsCurrentPage}&limit=${REQUESTS_PER_PAGE}`;
        if (statusFilter) url += `&status=${statusFilter}`;
        
        const data = await apiFetch(url);
        
        if (data.requests && data.requests.length > 0) {
            actionsContainer.style.display = 'flex';

            list.innerHTML = data.requests.map(req => {
                const changes = Object.entries(req.ProposedData || {})
                    .map(([key, val]) => `<span style=" padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 5px; color: var(--text-primary); border: 1px solid var(--card-border); display: inline-block; margin-bottom: 4px;">${key}: ${val}</span>`)
                    .join('');
                
                const isLocked = ['Pending', 'Under Review'].includes(req.Status);

                return `
                <tr style="border-bottom: 1px solid var(--card-border); background: var(--card-bg);">
                    <td style="padding: 12px 15px; text-align: center;">
                        ${!isLocked ? `<input type="checkbox" class="request-checkbox" value="${req._id}" onchange="updateBulkDeleteState()">` : '<i class="fa-solid fa-lock" title="Active requests cannot be deleted" style="color: #ccc;"></i>'}
                    </td>
                    <td style="padding: 12px 15px; color: var(--text-secondary); white-space: nowrap;">
                        ${new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                    </td>
                    <td style="padding: 12px 15px;">
                        ${changes || '<em style="color:#999">No data</em>'}
                    </td>
                    <td style="padding: 12px 15px; color: var(--text-primary); font-size: 0.9em; max-width: 250px;">
                        ${req.AdminNote ? `<strong>Note:</strong> ${req.AdminNote}` : '<span style="color: var(--text-secondary);">-</span>'}
                    </td>
                    <td style="padding: 12px 15px; text-align: center;">
                        <span style="font-size: 0.85em; padding: 4px 10px; border-radius: 12px; border: 1px solid currentColor; background: var(--bg-color); color: ${req.Status === 'Approved' ? 'var(--success-color)' : (req.Status === 'Rejected' || req.Status === 'Cancelled' ? 'var(--error-color)' : (req.Status === 'Under Review' ? 'var(--primary-color)' : 'var(--warning-color)'))}; font-weight: 600; white-space: nowrap;">
                            ${req.Status}
                        </span>
                    </td>
                </tr>
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
            list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No request history found.</td></tr>';
        }
    } catch (error) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error: ${error.message}</td></tr>`;
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
    bulkBtn.innerHTML = `<i class="fa-solid fa-trash"></i> (${checkboxes.length})`;
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
    msg.innerHTML = '';

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
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(107, 114, 128, 0.1); border: 1px solid var(--text-secondary); color: var(--text-secondary); font-weight: 500;"><i class="fa-solid fa-circle-info"></i> No changes were made.</div>`;
        btn.disabled = false;
        btn.textContent = 'Submit Request';
        return;
    }

    try {
        await apiFetch('/students/profile-update', {
            method: 'POST',
            body: JSON.stringify(proposedData)
        });
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success-color); color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Update request submitted successfully!</div>`;
        setTimeout(() => {
            closeProfileUpdateModal();
            loadProfileRequestStatus(); // Refresh status
        }, 2000);
    } catch (error) {
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error-color); color: var(--error-color); font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> ${error.message}</div>`;
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
    msg.innerHTML = '';

    const rawMonth = document.getElementById('feeMonth').value;
    const [y, m] = rawMonth.split('-');
    const date = new Date(y, m - 1);
    const formattedMonth = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const formData = new FormData();
    formData.append('Month', formattedMonth);
    formData.append('Amount', document.getElementById('feeAmount').value);
    formData.append('Batch', document.getElementById('feeBatch').value);
    formData.append('receipt', document.getElementById('feeReceipt').files[0]);

    try {
        await apiFetch('/fees/upload', {
            method: 'POST',
            body: formData
        });
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success-color); color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Receipt uploaded successfully!</div>`;
        document.getElementById('feeMonth').value = '';
        // document.getElementById('feeAmount').value = ''; // Keep amount fixed
        document.getElementById('feeReceipt').value = '';

        loadFees(true); // Force fetch and refresh list
        validateFeeForm(); // Reset button state
    } catch (error) {
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error-color); color: var(--error-color); font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> ${error.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Receipt';
    }
}

window.prepareReupload = function(month) {
    const feeMonthInput = document.getElementById('feeMonth');
    if (feeMonthInput) {
        const date = new Date(month);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        feeMonthInput.value = `${y}-${m}`;
    }
    
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

window.reportAttendanceIssue = function() {
    window.location.hash = '#issues';
    setTimeout(() => {
        const container = document.getElementById('issueFormContainer');
        if (container && window.innerWidth <= 768 && !container.classList.contains('expanded')) {
            container.classList.add('expanded');
            const header = document.querySelector('.mobile-collapse-header[onclick*="issueFormContainer"]');
            if (header) {
                const icon = header.querySelector('i.desktop-hidden');
                if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            }
        }
        const titleInput = document.getElementById('issueTitle');
        const descInput = document.getElementById('issueDesc');
        if (titleInput) titleInput.value = "Attendance Override Request";
        if (descInput) { descInput.value = "I missed my check-in/out because: "; descInput.focus(); }
        validateIssueForm();
    }, 150);
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
    msg.innerHTML = '';

    const payload = {
        IssueTitle: document.getElementById('issueTitle').value,
        Description: document.getElementById('issueDesc').value
    };

    try {
        await apiFetch('/issues/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success-color); color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Issue reported successfully!</div>`;
        document.getElementById('issueForm').reset();
        loadIssues(true); // Force fetch new issue and reset pagination
        validateIssueForm(); // Reset button state
    } catch (error) {
        msg.innerHTML = `<div style="padding: 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error-color); color: var(--error-color); font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> ${error.message}</div>`;
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
// Notifications by Admin
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
                    ${new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')} <span style="margin:0 5px; opacity:0.6">|</span> ${new Date(ann.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
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
    document.getElementById('annModalDate').textContent = `${new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')} | ${new Date(ann.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
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

// Global Helper to copy text to clipboard securely
window.copyToClipboard = function(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(err => {
            showToast('Failed to copy', 'error');
        });
    } else {
        // Fallback for older browsers or non-HTTPS connections
        let textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
        textArea.remove();
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
    
    // Phone OTP Modal
    if (!document.getElementById('phoneOtpModal')) {
        const div = document.createElement('div');
        div.id = 'phoneOtpModal';
        div.className = 'custom-modal-overlay';
        div.style.display = 'none';
        div.innerHTML = `
            <div class="custom-box">
                <h3 style="margin-bottom: 10px;">Phone Verification</h3>
                <p style="margin-bottom: 15px; color: var(--text-secondary);">Enter the 6-digit code sent to your phone.</p>
                <div style="margin-bottom: 15px;">
                    <input type="number" id="phoneOtpInput" placeholder="123456" style="width: 100%; padding: 0.5rem; border: 1px solid var(--input-border); border-radius: 4px; font-size: 1.2rem; text-align: center; letter-spacing: 5px;">
                </div>
                <div style="text-align: center; margin-bottom: 15px;">
                    <span id="phoneTimerText" style="color: var(--text-secondary); font-size: 0.9em;">Resend in <b id="phoneSeconds">60</b>s</span>
                    <button id="resendPhoneBtn" onclick="resendPhoneOtp()" style="display:none; border:none; background:none; color:var(--primary-color); cursor:pointer; font-weight: bold; width: 100%;">Resend SMS</button>
                </div>
                <div class="custom-actions">
                    <button class="btn btn-cancel" onclick="closePhoneModal()">Cancel</button>
                    <button id="phoneSubmitBtn" class="btn" onclick="confirmPhoneOtp()">Verify SMS</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }
    
    // Recaptcha Container for Firebase
    if (!document.getElementById('recaptcha-container')) {
        const div = document.createElement('div');
        div.id = 'recaptcha-container';
        document.body.appendChild(div);
    }

    // Attendance Scanner Modal
    if (!document.getElementById('scannerModal')) {
        const div = document.createElement('div');
        div.id = 'scannerModal';
        div.className = 'custom-modal-overlay';
        div.style.display = 'none';
        div.innerHTML = `
            <div class="custom-box" style="width: 90%; max-width: 400px; padding: 20px; position: relative; overflow: hidden; min-height: 380px;">
                <div id="scannerContent">
                    <h3 style="margin-bottom: 10px;"><i class="fa-solid fa-expand"></i> Scan to Check-In</h3>
                    <p style="margin-bottom: 15px; color: var(--text-secondary); font-size: 0.9em;">Point your camera at the library's official door QR code.</p>
                    <div id="reader" style="width: 100%; min-height: 250px; background: #f3f4f6; border-radius: 8px; overflow: hidden; border: 2px dashed var(--primary-color);"></div>
                    <div class="custom-actions" style="margin-top: 20px;">
                        <button class="btn btn-cancel" onclick="closeScanner()" style="width: 100%;">Cancel</button>
                    </div>
                </div>
                
                <div id="scannerVerificationOverlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--card-bg); z-index: 10; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <i class="fa-solid fa-fingerprint fa-beat-fade" style="font-size: 4em; color: var(--primary-color); margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: var(--text-primary);">Verifying Scan...</h3>
                    <p style="color: var(--text-secondary); font-size: 0.95em; padding: 0 20px;">Checking network connection and logging attendance</p>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    // Floating Action Button (FAB) for Scanner
    if (!document.getElementById('fabScanner')) {
        const fab = document.createElement('button');
        fab.id = 'fabScanner';
        fab.className = 'btn';
        fab.style.cssText = 'position: fixed; bottom: 30px; right: 30px; width: 65px; height: 65px; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 1000; font-size: 1.8em; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;';
        fab.innerHTML = '<i class="fa-solid fa-camera"></i>';
        fab.title = 'Scan Door QR';
        fab.onclick = () => openScanner();
        fab.onmouseover = () => fab.style.transform = 'scale(1.1)';
        fab.onmouseout = () => fab.style.transform = 'scale(1)';
        document.body.appendChild(fab);
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

// --- Attendance Scanner Logic ---
let html5QrcodeScanner = null;

window.openScanner = function() {
    if (originalProfileData.AccountStatus !== 'Active') {
        showToast("Your account must be active to mark attendance.", "error");
        return;
    }
    if (typeof Html5QrcodeScanner === 'undefined') {
        showToast("Scanner library not loaded. Admin needs to add html5-qrcode script.", "error");
        return;
    }

    document.getElementById('scannerModal').style.display = 'flex';
    
    if (!html5QrcodeScanner) {
        // Small delay ensures modal is visible before rendering camera
        setTimeout(() => {
            html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        }, 100);
    }
}

window.closeScanner = function() {
    document.getElementById('scannerModal').style.display = 'none';
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error(e));
        html5QrcodeScanner = null;
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (html5QrcodeScanner && html5QrcodeScanner.pause) {
        try { html5QrcodeScanner.pause(); } catch(e) {}
    }

    const content = document.getElementById('scannerContent');
    const overlay = document.getElementById('scannerVerificationOverlay');
    
    if (content) content.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';

    apiFetch('/students/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({ qrData: decodedText })
    })
    .then(response => {
        setTimeout(() => {
            closeScanner();
            showToast(response.message, 'success');
            if (window.location.hash === '#profile' || window.location.hash === '') loadProfile();
        }, 5000); // 5s delay for animation to play out nicely
    })
    .catch(error => {
        setTimeout(() => {
            closeScanner();
            showToast(error.message, 'error');
        }, 5000);
    });
}

let currentAttendanceHistory = [];
let attendanceHistoryPage = 1;
let ATTENDANCE_HISTORY_PER_PAGE = 10;

window.changeAttendanceHistoryLimit = function() {
    ATTENDANCE_HISTORY_PER_PAGE = parseInt(document.getElementById('filterAttendancePerPage').value) || 10;
    attendanceHistoryPage = 1;
    renderAttendanceHistory();
}

window.loadAttendanceHistory = async function() {
    const list = document.getElementById('attendanceHistoryList');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading history...</td></tr>';
    if (document.getElementById('attendanceHistoryPagination')) document.getElementById('attendanceHistoryPagination').innerHTML = '';
    try {
        const data = await apiFetch('/students/attendance/history');
        if (data && data.length > 0) {
            currentAttendanceHistory = data;
            attendanceHistoryPage = 1;
            renderAttendanceHistory();
        } else {
            list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No attendance history found.</td></tr>';
        }
    } catch (err) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error: ${err.message}</td></tr>`;
    }
}

function renderAttendanceHistory() {
    const list = document.getElementById('attendanceHistoryList');
    const paginationContainer = document.getElementById('attendanceHistoryPagination');

    const startIndex = (attendanceHistoryPage - 1) * ATTENDANCE_HISTORY_PER_PAGE;
    const endIndex = startIndex + ATTENDANCE_HISTORY_PER_PAGE;
    const paginatedHistory = currentAttendanceHistory.slice(startIndex, endIndex);

    list.innerHTML = paginatedHistory.map(r => {
        const inTime = r.CheckInTime ? new Date(r.CheckInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--';
        const outTime = r.CheckOutTime ? new Date(r.CheckOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--';
        let hrs = '--';
        if (r.TotalHours) {
            hrs = String(Math.floor(Math.round(r.TotalHours * 60) / 60)).padStart(2, '0') + ':' + String(Math.round(r.TotalHours * 60) % 60).padStart(2, '0') + ' hrs';
        } else if (r.CheckInTime) {
            hrs = '<span style="color: var(--success-color); font-size: 0.9em;"><i class="fa-solid fa-circle-dot fa-fade"></i> Active</span>';
        }
        const dateFormatted = r.DateString.split('-').reverse().join('-');

        let note = '<span style="color: var(--text-secondary);">-</span>';
        if (r.CheckOutTime) {
            if (r.CheckOutMethod === 'Admin') {
                note = '<span style="color: var(--warning-color); font-weight: 500; font-size: 0.9em;"><i class="fa-solid fa-user-shield"></i> Admin Checkout</span>';
            } else if (r.CheckOutMethod === 'Auto') {
                note = '<span style="color: var(--text-secondary); font-weight: 500; font-size: 0.9em;"><i class="fa-solid fa-robot"></i> Auto Checkout</span>';
            } else {
                note = '<span style="color: var(--success-color); font-weight: 500; font-size: 0.9em;"><i class="fa-solid fa-user-check"></i> Self Checkout</span>';
            }
        }

        return `
        <tr style="border-bottom: 1px solid var(--card-border); background: var(--card-bg);">
            <td style="padding: 12px 15px; color: var(--text-primary); font-weight: 500; white-space: nowrap;">
                <i class="fa-regular fa-calendar" style="color: var(--text-secondary); margin-right: 5px;"></i> ${dateFormatted}
            </td>
            <td style="padding: 12px 15px; color: var(--success-color); font-weight: 600;">${inTime}</td>
            <td style="padding: 12px 15px; color: var(--error-color); font-weight: 600;">${outTime}</td>
            <td style="padding: 12px 15px; color: var(--text-primary); font-weight: 600;">${hrs}</td>
            <td style="padding: 12px 15px;">${note}</td>
        </tr>`;
    }).join('');

    const totalPages = Math.ceil(currentAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE);
    if (totalPages > 1) {
        let paginationHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9em;">';
        paginationHTML += `<button onclick="changeAttendanceHistoryPage(${attendanceHistoryPage - 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${attendanceHistoryPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
        paginationHTML += `<span style="font-weight: 500; color: var(--text-secondary); padding: 0 5px;">${attendanceHistoryPage} / ${totalPages}</span>`;
        paginationHTML += `<button onclick="changeAttendanceHistoryPage(${attendanceHistoryPage + 1})" class="btn-outline" style="padding: 0.2rem 0.5rem; border-radius: 6px;" ${attendanceHistoryPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
        paginationHTML += '</div>';
        if (paginationContainer) paginationContainer.innerHTML = paginationHTML;
    } else {
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
}

window.changeAttendanceHistoryPage = function(page) {
    const totalPages = Math.ceil(currentAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    attendanceHistoryPage = page;
    renderAttendanceHistory();
}

function onScanFailure(error) {
    // Suppress console spam from typical frame failures
}

// --- Email OTP Verification Logic ---
let otpTimer;

window.openEmailOtpModal = async function() {
    const email = originalProfileData.Email;
    const name = originalProfileData.FirstName;
    const libId = originalProfileData.LibraryID;

    document.getElementById('emailOtpModal').style.display = 'block';
    document.getElementById('emailOtpInput').value = '';
    startOtpTimer();

    try {
        await apiFetch('/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email, name, libraryid: libId })
        });
        showToast('OTP sent to your email', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to send OTP', 'error');
    }
}

function startOtpTimer() {
    let seconds = 60;
    const secondsEl = document.getElementById('otpSeconds');
    const timerText = document.getElementById('otpTimerText');
    const resendBtn = document.getElementById('resendOtpBtn');

    resendBtn.style.display = 'none';
    timerText.style.display = 'block';
    clearInterval(otpTimer);

    otpTimer = setInterval(() => {
        seconds--;
        secondsEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(otpTimer);
            timerText.style.display = 'none';
            resendBtn.style.display = 'inline-block';
        }
    }, 1000);
}

window.verifyEmailOtp = async function() {
    const otpInput = document.getElementById('emailOtpInput').value;
    if (!otpInput || otpInput.length !== 6) {
        showToast('Please enter a 6-digit OTP', 'warning');
        return;
    }

    const fullOtp = `KNL${otpInput}`;
    const email = originalProfileData.Email;
    const btn = document.getElementById('emailSubmitBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    try {
        await apiFetch('/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp: fullOtp })
        });

        showToast('Email Verified Successfully!', 'success');
        closeEmailOtpModal();
        
        // Update UI immediately without reload
        originalProfileData.isEmailVerified = true;
        const container = document.getElementById('emailVerifyContainer');
        if (container) {
            container.innerHTML = `<span style="color: var(--success-color); font-size: 0.9em; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-circle-check"></i> Verified</span>`;
        }
    } catch (err) {
        showToast(err.message || 'Invalid or Expired OTP', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.closeEmailOtpModal = function() {
    document.getElementById('emailOtpModal').style.display = 'none';
    clearInterval(otpTimer);
}

// --- Phone OTP Verification Logic (Firebase) ---
const firebaseConfig = {
    // apiKey is now fetched dynamically from the backend
    authDomain: "knowledgenooklibrarysms.firebaseapp.com",
    projectId: "knowledgenooklibrarysms",
    storageBucket: "knowledgenooklibrarysms.firebasestorage.app",
    messagingSenderId: "411915565657",
    appId: "1:411915565657:web:5e8da9578accfe785f0f48"
};

let phoneConfirmationResult = null;
let phoneTimerInterval = null;

window.openPhoneOtpModal = async function() {
    if (typeof firebase === 'undefined') {
        showToast('Firebase not loaded. Please add Firebase scripts to your HTML.', 'error');
        return;
    }
    if (!firebase.apps.length) {
        try {
            const config = await apiFetch('/config/firebase');
            firebaseConfig.apiKey = config.apiKey;
            firebase.initializeApp(firebaseConfig);
        } catch (err) {
            showToast('Failed to load Firebase configuration.', 'error');
            return;
        }
    }

    const contact = originalProfileData.Contact;
    const name = originalProfileData.FirstName;
    const libId = originalProfileData.LibraryID;
    const phoneNumber = "+91" + contact; // Must include country code

    try {
        // Log attempt to enforce rate limiting
        await apiFetch('/log-phone-attempt', {
            method: 'POST',
            body: JSON.stringify({ libraryid: libId, name, contact })
        });
    } catch (err) {
        return showToast('Daily SMS limit reached. Try tomorrow.', 'error');
    }

    // Initialize Invisible Recaptcha
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
    }

    try {
        showToast('Sending SMS...', 'info');
        phoneConfirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
        
        document.getElementById('phoneOtpModal').style.display = 'flex';
        startPhoneTimer();
        showToast('SMS sent successfully!', 'success');
    } catch (error) {
        console.error("SMS Error:", error);
        showToast('Failed to send SMS. Reload and try again.', 'error');
        if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        
        // Completely recreate the DOM element so reCAPTCHA can safely re-initialize on the next click
        const oldRecaptcha = document.getElementById('recaptcha-container');
        if (oldRecaptcha) {
            oldRecaptcha.remove();
            const newRecaptcha = document.createElement('div');
            newRecaptcha.id = 'recaptcha-container';
            document.body.appendChild(newRecaptcha);
        }
    }
}

window.confirmPhoneOtp = async function() {
    const code = document.getElementById('phoneOtpInput').value;
    const contact = originalProfileData.Contact;
    const btn = document.getElementById('phoneSubmitBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    try {
        await phoneConfirmationResult.confirm(code);
        await apiFetch('/verify-phone-success', {
            method: 'POST',
            body: JSON.stringify({ contact })
        });

        showToast('Phone Verified Successfully!', 'success');
        closePhoneModal();

        const container = document.getElementById('phoneVerifyContainer');
        if (container) {
            container.innerHTML = `<span style="color: var(--success-color); font-size: 0.9em; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-circle-check"></i> Verified</span>`;
        }
        originalProfileData.isContactVerified = true;
    } catch (error) {
        showToast('Invalid OTP code.', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function startPhoneTimer() {
    let seconds = 60;
    const timerText = document.getElementById('phoneTimerText');
    const resendBtn = document.getElementById('resendPhoneBtn');
    const secondsEl = document.getElementById('phoneSeconds');
    
    timerText.style.display = 'block';
    resendBtn.style.display = 'none';
    secondsEl.textContent = seconds;
    
    if (phoneTimerInterval) clearInterval(phoneTimerInterval);
    
    phoneTimerInterval = setInterval(() => {
        seconds--;
        secondsEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(phoneTimerInterval);
            timerText.style.display = 'none';
            resendBtn.style.display = 'inline-block';
        }
    }, 1000);
}

window.resendPhoneOtp = function() {
    document.getElementById('phoneOtpModal').style.display = 'none';
    openPhoneOtpModal();
}

window.closePhoneModal = function() {
    document.getElementById('phoneOtpModal').style.display = 'none';
    if (phoneTimerInterval) clearInterval(phoneTimerInterval);
}
window.resendEmailOtp = async function() {
    openEmailOtpModal(); 
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


// Admin Message
let allMessages = [];
let unreadMessages = [];
let readMessages = [];
let currentMsgTab = 'unread';
let msgUnreadPage = 1;
let msgReadPage = 1;
const MESSAGES_PER_PAGE = 5;

async function loadNotifications() {
    try {
        const notifications = await apiFetch('/students/notifications');
        if (notifications) {
            allMessages = notifications;
            processMessages();
        }
    } catch (error) {
        const list = document.getElementById('messagesListUnread');
        if (list) list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function processMessages() {
    unreadMessages = allMessages.filter(n => !n.IsRead);
    readMessages = allMessages.filter(n => n.IsRead);

    const unreadCount = unreadMessages.length;
    const badges = document.querySelectorAll('.notification-badge');
    badges.forEach(badge => {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    });

    renderMessageTab();
}

window.switchMessageTab = function(tab) {
    currentMsgTab = tab;
    
    const btnUnread = document.getElementById('msgTabBtnUnread');
    const btnRead = document.getElementById('msgTabBtnRead');
    
    if (tab === 'unread') {
        btnUnread.className = 'btn';
        btnUnread.style.cssText = 'padding: 4px 10px; border-radius: 16px; font-size: 0.9em; display:flex; align-items:center; gap:4px; white-space:nowrap;';
        btnRead.className = 'btn-outline';
        btnRead.style.cssText = 'padding: 4px 10px; border-radius: 16px; font-size: 0.9em; border: none; color: var(--text-secondary); display:flex; align-items:center; gap:4px; white-space:nowrap;';
        
        document.getElementById('msgTabUnreadContent').style.display = 'block';
        document.getElementById('msgTabReadContent').style.display = 'none';
    } else {
        btnRead.className = 'btn';
        btnRead.style.cssText = 'padding: 4px 10px; border-radius: 16px; font-size: 0.9em; display:flex; align-items:center; gap:4px; white-space:nowrap;';
        btnUnread.className = 'btn-outline';
        btnUnread.style.cssText = 'padding: 4px 10px; border-radius: 16px; font-size: 0.9em; border: none; color: var(--text-secondary); display:flex; align-items:center; gap:4px; white-space:nowrap;';
        
        document.getElementById('msgTabUnreadContent').style.display = 'none';
        document.getElementById('msgTabReadContent').style.display = 'block';
    }
    renderMessageTab();
}

function renderMessageTab() {
    if (currentMsgTab === 'unread') {
        renderMsgList('messagesListUnread', 'messagesPaginationUnread', unreadMessages, msgUnreadPage, true);
    } else {
        renderMsgList('messagesListRead', 'messagesPaginationRead', readMessages, msgReadPage, false);
    }
}
// Render personalized notifications sent by the admin to individual students
function renderMsgList(listId, paginationId, items, page, isUnread) {
    const list = document.getElementById(listId);
    const pagination = document.getElementById(paginationId);

    if (!items || items.length === 0) {
        list.innerHTML = `<p style="color: var(--text-secondary); padding: 10px; text-align:center;">No ${isUnread ? 'unread' : 'read'} messages.</p>`;
        pagination.innerHTML = '';
        return;
    }

    const start = (page - 1) * MESSAGES_PER_PAGE;
    const paginatedItems = items.slice(start, start + MESSAGES_PER_PAGE);

    list.innerHTML = paginatedItems.map(n => `
    <div style="
        border-left:4px solid ${n.IsRead ? 'transparent' : 'var(--primary-color)'};
        padding:15px;
        margin-bottom:12px;
        border-radius:8px;
        border:1px solid var(--card-border);
    ">

        <!-- TITLE -->
        <div style="
            font-weight:600;
            margin-bottom:6px;
            ${n.IsRead ? 'color:var(--text-primary)' : 'color:var(--primary-color)'}
        ">
            <i class="fa-solid ${n.IsRead ? 'fa-envelope-open' : 'fa-envelope'}" style="margin-right:6px;"></i>
            ${n.Title}
        </div>

        <!-- DATE + ACTIONS -->
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:10px;
            flex-wrap:wrap;
            gap:6px;
        ">

            <!-- DATE -->
            <span style="
                font-size:0.85em;
                color:var(--text-secondary);
                white-space:nowrap;
            ">
                ${new Date(n.createdAt).toLocaleDateString('en-GB',{
                    day:'2-digit',
                    month:'long',
                    year:'numeric'
                })}
                •
                ${new Date(n.createdAt).toLocaleTimeString('en-US',{
                    hour:'2-digit',
                    minute:'2-digit',
                    hour12:true
                })}
            </span>

            <!-- ACTION BUTTONS -->
            <div style="display:flex; gap:6px; flex-wrap:wrap;">

                ${
                    !n.IsRead
                    ? `
                    <button 
                        onclick="markNotificationRead('${n._id}')"
                        class="btn-outline"
                        style="
                            padding:3px 8px;
                            font-size:0.8em;
                            border-radius:4px;
                            color:var(--success-color);
                            border-color:var(--success-color);
                        ">
                        <i class="fa-solid fa-check"></i> Mark Read
                    </button>
                    `
                    : `
                    <button 
                        onclick="deleteAdminMessage('${n._id}')"
                        class="btn-outline"
                        style="
                            padding:3px 8px;
                            font-size:0.8em;
                            border-radius:4px;
                            color:var(--error-color);
                            border-color:var(--error-color);
                        ">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    `
                }

            </div>

        </div>

        <!-- MESSAGE -->
        <div style="
            font-size:0.95em;
            color:var(--text-secondary);
            white-space:pre-wrap;
            word-break:break-word;
            line-height:1.5;
        ">${n.Message}</div>

    </div>
    `).join('');

    const totalPages = Math.ceil(items.length / MESSAGES_PER_PAGE);
    if (totalPages > 1) {
        let html = '<div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9em;">';
        html += `<button onclick="changeMessagePage('${isUnread ? 'unread' : 'read'}', ${page - 1})" class="btn-outline" ${page === 1 ? 'disabled' : ''} style="padding: 2px 8px;"><i class="fa-solid fa-chevron-left"></i></button>`;
        html += `<span style="font-size: 0.9em; padding: 0 10px; align-self:center;">${page} / ${totalPages}</span>`;
        html += `<button onclick="changeMessagePage('${isUnread ? 'unread' : 'read'}', ${page + 1})" class="btn-outline" ${page === totalPages ? 'disabled' : ''} style="padding: 2px 8px;"><i class="fa-solid fa-chevron-right"></i></button>`;
        html += '</div>';
        pagination.innerHTML = html;
    } else {
        pagination.innerHTML = '';
    }
}

window.changeMessagePage = function(type, newPage) {
    if (type === 'unread') msgUnreadPage = newPage;
    else msgReadPage = newPage;
    renderMessageTab();
}

// Mark as read 
async function markNotificationRead(id) {
    try {
        await apiFetch('/students/notifications/read', {
            method: 'PUT',
            body: JSON.stringify({ id })
        });
        const notification = allMessages.find(n => n._id === id);
        if (notification) notification.IsRead = true;
        processMessages();
    } catch (error) {
        showToast('Error marking message as read: ' + error.message, 'error');
    }
}

// Allow deletion only for read messages and notify admin that the student deleted it
async function deleteAdminMessage(id) {
    if (!await showConfirm('Are you sure you want to delete this message?')) return;
    try {
        await apiFetch('/students/notifications/' + id, { method: 'DELETE' });
        showToast('Message deleted', 'success');
        
        allMessages = allMessages.filter(n => n._id !== id);
        processMessages();
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

function checkPushStatus() {
    const btn = document.getElementById('pushStatusBtn');
    const icon = document.getElementById('pushStatusIcon');
    if (!btn || !icon) return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        btn.style.display = 'none';
        return;
    }

    if (Notification.permission === 'granted') {
        icon.className = 'fa-solid fa-bell';
        icon.style.color = 'var(--success-color)';
        btn.title = "Notifications Enabled";
    } else if (Notification.permission === 'denied') {
        icon.className = 'fa-solid fa-bell-slash';
        icon.style.color = 'var(--error-color)';
        btn.title = "Notifications Blocked (Unblock in browser settings)";
    } else {
        icon.className = 'fa-solid fa-bell-slash';
        icon.style.color = 'var(--warning-color)';
        btn.title = "Enable Notifications";
    }
}

async function subscribeToPushNotifications(manual = false) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            if (Notification.permission === 'denied' && manual) {
                showToast('Notifications are blocked. Please unblock them in your browser site settings.', 'warning');
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();
                
                const { publicKey } = await apiFetch('/students/vapid-public-key');
                const convertedVapidKey = urlBase64ToUint8Array(publicKey);
                let needsSubscribe = false;
                let oldEndpoint = null;

                if (subscription) {
                    const currentKey = subscription.options.applicationServerKey;
                    let keysMatch = true;
                    
                    if (currentKey) {
                        const currentKeyArray = new Uint8Array(currentKey);
                        if (currentKeyArray.length !== convertedVapidKey.length) {
                            keysMatch = false;
                        } else {
                            for (let i = 0; i < currentKeyArray.length; i++) {
                                if (currentKeyArray[i] !== convertedVapidKey[i]) {
                                    keysMatch = false;
                                    break;
                                }
                            }
                        }
                    } else {
                        keysMatch = false;
                    }

                    if (!keysMatch) {
                        oldEndpoint = subscription.endpoint;
                        await subscription.unsubscribe();
                        needsSubscribe = true;
                    }
                } else {
                    needsSubscribe = true;
                }

                if (needsSubscribe) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    });
                }
                
                await apiFetch('/students/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({ subscription, oldEndpoint })
                });
                
                if (manual) showToast('Notifications enabled successfully!', 'success');
            } else if (manual) {
                showToast('Notification permission denied.', 'error');
            }
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            if (manual) showToast('Error enabling notifications.', 'error');
        } finally {
            if (typeof checkPushStatus === 'function') checkPushStatus();
        }
    } else if (manual) {
        showToast('Push notifications are not supported in this browser.', 'warning');
    }
}
