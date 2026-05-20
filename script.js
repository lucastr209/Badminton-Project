// ==========================================
// 0. LÁ CHẮN BẢO MẬT (XSS SANITIZER)
// ==========================================
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = {'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'};
        return charsToReplace[tag] || tag;
    });
}

// ==========================================
// 0.5 GHI ĐÈ THÔNG BÁO (POP-UP TRUNG TÂM CÓ MÀN CHẮN)
// ==========================================
const originalAlert = window.alert; 
window.alert = function(message) {
    const container = document.getElementById('toast-container');
    if (!container) { originalAlert(message); return; }
    
    container.innerHTML = '';
    container.classList.add('show');
    
    const toast = document.createElement('div');
    const isSuccess = message.toLowerCase().includes('thành công');
    toast.className = `custom-toast ${isSuccess ? 'success' : 'error'}`;
    const icon = isSuccess ? '✅' : '⚠️';
    
    toast.innerHTML = `<div style="font-size: 50px; line-height: 1; margin-bottom: 5px;">${icon}</div> <div>${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'popUpOut 0.4s forwards';
        setTimeout(() => {
            toast.remove(); 
            if (container.childElementCount === 0) container.classList.remove('show');
        }, 400); 
    }, 3000);
};

// ==========================================
// 1. TÍNH NĂNG DARK MODE (GIAO DIỆN TỐI)
// ==========================================
const themeCheckbox = document.getElementById('theme-toggle-checkbox');
const themeLabel = document.getElementById('theme-label-text');
const body = document.body;

if (localStorage.getItem('akTheme') === 'dark') {
    body.classList.add('dark-theme');
    if (themeCheckbox) themeCheckbox.checked = true; 
    if (themeLabel) themeLabel.innerText = '🌙';
}

if (themeCheckbox) {
    themeCheckbox.addEventListener('change', () => {
        if (themeCheckbox.checked) {
            body.classList.add('dark-theme');
            localStorage.setItem('akTheme', 'dark'); 
            if (themeLabel) themeLabel.innerText = '🌙';
        } else {
            body.classList.remove('dark-theme');
            localStorage.setItem('akTheme', 'light');
            if (themeLabel) themeLabel.innerText = '☀️';
        }
    });
}

// ==========================================
// 2. CƠ SỞ DỮ LIỆU & BIẾN TOÀN CỤC
// ==========================================
let bookedSessions = JSON.parse(localStorage.getItem('akBadmintonDB')) || [];
const paymentModal = document.getElementById('payment-modal');
const modalTotalAmount = document.getElementById('modal-total-amount');
const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
const cancelModalX = document.getElementById('cancel-modal-x');
const ticketDiv = document.getElementById('booking-ticket');
const submitBtn = document.getElementById('submit-btn');

let pendingBookings = []; 
let countdownInterval; 
let currentGlobalTotal = 0; // Lưu tổng tiền để chia Bill

let today = new Date().toLocaleDateString('vi-VN');
let spamCheck = JSON.parse(localStorage.getItem('akSpamCheck')) || { date: today, count: 0 };
if (spamCheck.date !== today) { spamCheck = { date: today, count: 0 }; }

// ==========================================
// 3. HÀM XỬ LÝ POP-UP VÀ ĐỒNG HỒ FOMO
// ==========================================
function startCountdown() {
    let time = 300; 
    const timerDisplay = document.getElementById('countdown-timer');
    clearInterval(countdownInterval); 
    countdownInterval = setInterval(() => {
        const minutes = Math.floor(time / 60);
        let seconds = time % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        if(timerDisplay) timerDisplay.innerHTML = `⏳ Thời gian giữ chỗ: <span style="font-size:22px">${minutes}:${seconds}</span>`;
        time--;
        if (time < 0) {
            clearInterval(countdownInterval); closeModal();
            alert("⏰ Đã hết 5 phút giữ chỗ! Phiên giao dịch đã bị hủy.");
        }
    }, 1000);
}

function openModal() { paymentModal.style.display = 'flex'; ticketDiv.style.display = 'none'; startCountdown(); }
function closeModal() { paymentModal.style.display = 'none'; clearInterval(countdownInterval); }

// ==========================================
// 4. BẢNG MATRIX GRID VÀ FLASH SALE
// ==========================================
const bookingDateInput = document.getElementById('booking-date');
const matrixContainer = document.getElementById('matrix-container');
let matrixSelectedSlots = []; 

if (bookingDateInput) {
    bookingDateInput.addEventListener('change', renderMatrix);
}

function renderMatrix() {
    const date = bookingDateInput.value;
    if (!date) return;

    // Lấy giờ hiện tại để tính Flash Sale
    const now = new Date();
    const isToday = (date === (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')));
    const currentHour = now.getHours();

    matrixSelectedSlots = []; 
    const courts = [{ id: 'san1', name: 'Sân 1' }, { id: 'san2', name: 'Sân 2' }, { id: 'san3', name: 'Sân 3' }, { id: 'san4', name: 'Sân 4' }];
    const hours = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    let html = '<table class="matrix-table"><thead><tr><th class="time-col">Giờ</th>';
    courts.forEach(c => html += `<th>${c.name}</th>`);
    html += '</tr></thead><tbody>';

    hours.forEach(h => {
        let displayHour = `${h < 10 ? '0'+h : h}:00`;
        html += `<tr><td class="time-col">${displayHour}</td>`;

        courts.forEach(c => {
            let isBooked = false;
            for (let session of bookedSessions) {
                if (session.date === date && session.court === c.id) {
                    let start = parseInt(session.startTime.split(':')[0]);
                    let end = parseInt(session.endTime.split(':')[0]);
                    if (h >= start && h < end) { isBooked = true; break; }
                }
            }

            // Kích hoạt Flash Sale nếu là hôm nay và trong vòng 2 tiếng tới
            let isFlashSale = false;
            if (isToday && h > currentHour && (h - currentHour) <= 2) {
                isFlashSale = true;
            }

            const slotKey = `${c.id}-${h}`;
            if (isBooked) {
                html += `<td class="matrix-cell booked" title="Đã có người đặt">Kín</td>`;
            } else {
                if (isFlashSale) {
                    html += `<td class="matrix-cell sale" data-court="${c.id}" data-hour="${h}" data-key="${slotKey}" data-sale="true">Flash Sale</td>`;
                } else {
                    html += `<td class="matrix-cell empty" data-court="${c.id}" data-hour="${h}" data-key="${slotKey}" data-sale="false">Trống</td>`;
                }
            }
        });
        html += `</tr>`;
    });
    html += '</tbody></table>';
    matrixContainer.innerHTML = html;

    // Lắng nghe sự kiện click
    document.querySelectorAll('.matrix-cell:not(.booked)').forEach(cell => {
        cell.addEventListener('click', function() {
            const key = this.getAttribute('data-key');
            
            if (matrixSelectedSlots.includes(key)) {
                matrixSelectedSlots = matrixSelectedSlots.filter(k => k !== key);
                this.classList.remove('selected');
                this.innerText = this.getAttribute('data-sale') === 'true' ? 'Flash Sale' : 'Trống';
            } else {
                matrixSelectedSlots.push(key);
                this.classList.add('selected');
                this.innerText = 'Đã chọn';
            }
        });
    });
}

// ==========================================
// 5. XÁC NHẬN ĐẶT SÂN & TÍNH TIỀN THÔNG MINH
// ==========================================
submitBtn.addEventListener('click', function(event) {
    event.preventDefault(); 
    if (spamCheck.count >= 3) { alert("⚠️ BẢO MẬT: Giới hạn 3 đơn/ngày."); return; }

    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const selectedDate = document.getElementById('booking-date').value;
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const isRecurring = document.getElementById('recurring-booking') ? document.getElementById('recurring-booking').checked : false;
    const weeksToBook = isRecurring ? 4 : 1; 

    if (!customerName || !customerPhone || !selectedDate) { alert("Vui lòng điền đủ thông tin và Ngày đặt!"); return; }
    if (matrixSelectedSlots.length === 0) { alert("Vui lòng click chọn ít nhất 1 ô trống trên Bảng lưới ma trận!"); return; }

    let datesToBook = [];
    let baseDateObj = new Date(selectedDate);
    for(let i = 0; i < weeksToBook; i++) {
        let nextDate = new Date(baseDateObj);
        nextDate.setDate(baseDateObj.getDate() + (i * 7)); 
        datesToBook.push(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`);
    }

    if (isRecurring) {
        let conflictFound = false;
        for (let d of datesToBook) {
            for (let slot of matrixSelectedSlots) {
                let parts = slot.split('-'); let courtId = parts[0]; let h = parseInt(parts[1]);
                for (let session of bookedSessions) {
                    if (session.date === d && session.court === courtId) {
                        let start = parseInt(session.startTime.split(':')[0]); let end = parseInt(session.endTime.split(':')[0]);
                        if (h >= start && h < end) { conflictFound = true; break; }
                    }
                }
                if(conflictFound) break;
            }
            if(conflictFound) break;
        }
        if (conflictFound) { alert("Một số ô bạn chọn đã bị khách khác đặt trùng trong các tuần tới. Vui lòng tắt Đặt Cố Định!"); return; }
    }

    let totalCourtPrice = 0; 
    let hasGoldenHour = false;
    let courtNamesSet = new Set();
    let hoursSet = new Set();
    let hasFlashSale = false;

    matrixSelectedSlots.forEach(slot => {
        let parts = slot.split('-');
        let courtId = parts[0]; 
        let h = parseInt(parts[1]);
        
        courtNamesSet.add(courtId.replace('san', 'Sân '));
        hoursSet.add(h);

        // Kiểm tra xem ô này có đang được Flash Sale không (lấy dữ liệu từ DOM)
        let cellObj = document.querySelector(`.matrix-cell[data-key="${slot}"]`);
        let isSaleSlot = cellObj && cellObj.getAttribute('data-sale') === 'true';

        let basePrice = (h >= 17 && h <= 20) ? 120000 : 80000;
        if (h >= 17 && h <= 20) hasGoldenHour = true;
        
        if (isSaleSlot && !isRecurring) { 
            // Giảm 30% cho giờ chót (Chỉ áp dụng nếu không đặt cố định)
            totalCourtPrice += (basePrice * 0.7);
            hasFlashSale = true;
        } else {
            totalCourtPrice += basePrice;
        }
    });

    let sortedHours = Array.from(hoursSet).sort((a,b)=>a-b);
    let displayStartTime = (sortedHours[0] < 10 ? '0'+sortedHours[0] : sortedHours[0]) + ":00";
    let displayEndTime = ((sortedHours[sortedHours.length-1]+1) < 10 ? '0'+(sortedHours[sortedHours.length-1]+1) : (sortedHours[sortedHours.length-1]+1)) + ":00";
    
    let timeNote = "";
    if (hasFlashSale) timeNote += "<span style='color:#00ff88;'> (Áp dụng Flash Sale -30%)</span>";
    else if (hasGoldenHour) timeNote += " (Có Giờ Vàng)";

    let totalServicePrice = 0; let servicesList = [];
    const SECURE_PRICELIST = { "Trà đá": 10000, "Thuê vợt": 50000, "Ống cầu": 180000 };
    document.querySelectorAll('.service-item:checked').forEach(item => {
        if (SECURE_PRICELIST[item.value]) { totalServicePrice += SECURE_PRICELIST[item.value]; servicesList.push(item.value); }
    });

    let totalPrice = (totalCourtPrice + totalServicePrice) * weeksToBook;
    currentGlobalTotal = totalPrice; // Lưu để lát nữa Chia Bill

    pendingBookings = [];
    datesToBook.forEach(d => {
        matrixSelectedSlots.forEach(slot => {
            let parts = slot.split('-'); let courtId = parts[0]; let h = parseInt(parts[1]);
            pendingBookings.push({ date: d, court: courtId, startTime: (h < 10 ? '0'+h : h) + ":00", endTime: (h+1 < 10 ? '0'+(h+1) : h+1) + ":00", customerName: customerName, customerPhone: customerPhone });
        });
    });

    document.getElementById('ticket-name').innerText = customerName;
    document.getElementById('ticket-contact').innerText = customerPhone;
    document.getElementById('ticket-date').innerHTML = isRecurring ? `🔥 CỐ ĐỊNH TỪ: ${new Date(selectedDate).toLocaleDateString('vi-VN')} đến ${new Date(datesToBook[3]).toLocaleDateString('vi-VN')}` : new Date(selectedDate).toLocaleDateString('vi-VN');
    document.getElementById('ticket-court').innerText = Array.from(courtNamesSet).join(", ");
    document.getElementById('ticket-time').innerHTML = `Từ ${displayStartTime} đến ${displayEndTime} ${timeNote}`;
    document.getElementById('ticket-services').innerText = servicesList.length > 0 ? servicesList.join(", ") : "Không có";
    document.getElementById('ticket-total').innerText = totalPrice.toLocaleString('vi-VN');
    modalTotalAmount.innerText = totalPrice.toLocaleString('vi-VN');
    
    // Reset thanh chia tiền
    const splitSlider = document.getElementById('split-slider');
    if (splitSlider) {
        splitSlider.value = 1;
        document.getElementById('split-count').innerText = 1;
        document.getElementById('split-amount').innerText = totalPrice.toLocaleString('vi-VN');
    }

    const qrImage = document.querySelector('.qr-code-img') || document.getElementById('qr-image');
    const paymentInstruction = document.querySelector('.instruction') || document.getElementById('payment-instruction');
    
    if (paymentMethod === 'cash') {
        if (qrImage) qrImage.style.display = 'none'; 
        if (paymentInstruction) paymentInstruction.innerHTML = "💵 Vui lòng thanh toán tiền mặt tại quầy lễ tân trước khi nhận sân. Xin cảm ơn!";
        confirmPaymentBtn.innerText = "Xác Nhận Đặt Sân";
    } else {
        if (qrImage) qrImage.style.display = 'inline-block'; 
        if (paymentInstruction) paymentInstruction.innerText = "📱 Quét mã bằng ứng dụng Ngân hàng hoặc Ví điện tử (Momo/ZaloPay).";
        confirmPaymentBtn.innerText = "Tôi Đã Thanh Toán";
    }
    openModal();
});

// ==========================================
// 6. XỬ LÝ THANH TOÁN & HIỆU ỨNG PHÁO HOA
// ==========================================
cancelPaymentBtn.addEventListener('click', closeModal);
cancelModalX.addEventListener('click', closeModal);

confirmPaymentBtn.addEventListener('click', function() {
    closeModal(); 
    ticketDiv.style.display = 'block'; 
    
    if (typeof confetti !== "undefined") {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00ff88', '#00dbff', '#ffffff'] });
    }

    alert("🎉 Đặt sân thành công! Hệ thống đã ghi nhận ca đặt sân của bạn.");
    
    if (pendingBookings.length > 0) {
        pendingBookings.forEach(booking => { bookedSessions.push(booking); });
        localStorage.setItem('akBadmintonDB', JSON.stringify(bookedSessions));
        pendingBookings = []; 
        spamCheck.count += 1; localStorage.setItem('akSpamCheck', JSON.stringify(spamCheck));
        renderMatrix(); 
    }
});

// ==========================================
// 7. CÔNG CỤ XUẤT VÉ ĐIỆN TỬ & CHIA TIỀN (TÍNH NĂNG MỚI)
// ==========================================
// Kéo thanh trượt để chia tiền Real-time
const splitSlider = document.getElementById('split-slider');
if (splitSlider) {
    splitSlider.addEventListener('input', function() {
        const people = parseInt(this.value);
        document.getElementById('split-count').innerText = people;
        const amountPerPerson = Math.round(currentGlobalTotal / people);
        document.getElementById('split-amount').innerText = amountPerPerson.toLocaleString('vi-VN');
    });
}

// Bấm nút Tải ảnh E-ticket
const downloadTicketBtn = document.getElementById('download-ticket-btn');
if (downloadTicketBtn) {
    downloadTicketBtn.addEventListener('click', function() {
        const captureArea = document.getElementById('ticket-capture-area');
        // Sử dụng html2canvas để chụp ảnh khối HTML
        html2canvas(captureArea, { backgroundColor: '#1A1B20', scale: 2, borderRadius: 12 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `E-Ticket-AKBadminton-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
}

const sendZaloBtn = document.getElementById('send-zalo-btn');
if (sendZaloBtn) {
    sendZaloBtn.addEventListener('click', function() {
        const message = `🏸 *PHIẾU ĐẶT SÂN AK BADMINTON*\n👤 Tên: ${document.getElementById('ticket-name').innerText}\n📞 SĐT: ${document.getElementById('ticket-contact').innerText}\n📅 Ngày: ${document.getElementById('ticket-date').innerText}\n⛳ Sân: ${document.getElementById('ticket-court').innerText}\n💰 Tổng: ${document.getElementById('ticket-total').innerText} VNĐ`;
        window.open(`https://zalo.me/84908107436?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// ==========================================
// 8. CỘNG ĐỒNG GHÉP KÈO (MATCHMAKING)
// ==========================================
let matchPosts = JSON.parse(localStorage.getItem('akMatchPosts')) || [];
const matchForm = document.getElementById('match-form');
const matchBoard = document.getElementById('match-board');

function renderMatchPosts() {
    if (!matchBoard) return; matchBoard.innerHTML = "";
    if (matchPosts.length === 0) { matchBoard.innerHTML = "<p class='empty-text'>Chưa có ai tìm đồng đội lúc này.</p>"; return; }

    matchPosts.slice().reverse().forEach(function(post) {
        matchBoard.innerHTML += `
            <div class="match-card">
                <div class="match-info">
                    <h4>🏸 ${escapeHTML(post.name)}</h4>
                    <p>Thời gian: ${escapeHTML(post.time)}</p>
                    <span class="match-tag">${escapeHTML(post.level)}</span>
                </div>
                <a href="https://zalo.me/${escapeHTML(post.phone).replace(/\D/g,'')}" target="_blank" class="btn-gradient-success small">Nhắn Zalo</a>
            </div>
        `;
    });
}
renderMatchPosts();

if (matchForm) {
    matchForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        const newPost = { name: document.getElementById('match-name').value, phone: document.getElementById('match-phone').value, level: document.getElementById('match-level').value, time: document.getElementById('match-time').value };
        matchPosts.push(newPost); localStorage.setItem('akMatchPosts', JSON.stringify(matchPosts));
        matchForm.reset(); alert("Đã đăng tin tìm đồng đội thành công!"); renderMatchPosts();
    });
}