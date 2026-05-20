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
    
    if (!container) {
        originalAlert(message);
        return;
    }
    
    container.innerHTML = '';
    container.classList.add('show');
    
    const toast = document.createElement('div');
    const isSuccess = message.toLowerCase().includes('thành công');
    toast.className = `custom-toast ${isSuccess ? 'success' : 'error'}`;
    const icon = isSuccess ? '✅' : '⚠️';
    
    toast.innerHTML = `
        <div style="font-size: 50px; line-height: 1; margin-bottom: 5px;">${icon}</div> 
        <div>${message}</div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'popUpOut 0.4s forwards';
        setTimeout(() => {
            toast.remove(); 
            if (container.childElementCount === 0) {
                container.classList.remove('show');
            }
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
// 2. CƠ SỞ DỮ LIỆU ĐẶT SÂN
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

let today = new Date().toLocaleDateString('vi-VN');
let spamCheck = JSON.parse(localStorage.getItem('akSpamCheck')) || { date: today, count: 0 };
if (spamCheck.date !== today) {
    spamCheck = { date: today, count: 0 }; 
}

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
            clearInterval(countdownInterval);
            closeModal();
            alert("⏰ Đã hết 5 phút giữ chỗ! Phiên giao dịch đã bị hủy.");
        }
    }, 1000);
}

function openModal() { paymentModal.style.display = 'flex'; ticketDiv.style.display = 'none'; startCountdown(); }
function closeModal() { paymentModal.style.display = 'none'; clearInterval(countdownInterval); }

// ==========================================
// 4. BẢNG MATRIX GRID (TÍCH HỢP SÂN VÀ GIỜ)
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

            const slotKey = `${c.id}-${h}`;
            if (isBooked) {
                html += `<td class="matrix-cell booked" title="Đã có người đặt">Đã đặt</td>`;
            } else {
                html += `<td class="matrix-cell" data-court="${c.id}" data-hour="${h}" data-key="${slotKey}">Chọn</td>`;
            }
        });
        html += `</tr>`;
    });
    html += '</tbody></table>';
    matrixContainer.innerHTML = html;

    document.querySelectorAll('.matrix-cell:not(.booked)').forEach(cell => {
        cell.addEventListener('click', function() {
            const key = this.getAttribute('data-key');
            
            if (matrixSelectedSlots.includes(key)) {
                matrixSelectedSlots = matrixSelectedSlots.filter(k => k !== key);
                this.classList.remove('selected');
                this.innerText = 'Chọn';
            } else {
                matrixSelectedSlots.push(key);
                this.classList.add('selected');
                this.innerText = 'Đã chọn';
            }
        });
    });
}

// ==========================================
// 5. XỬ LÝ SỰ KIỆN "XÁC NHẬN ĐẶT SÂN" (MATRIX LOGIC)
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
                let parts = slot.split('-');
                let courtId = parts[0]; let h = parseInt(parts[1]);
                for (let session of bookedSessions) {
                    if (session.date === d && session.court === courtId) {
                        let start = parseInt(session.startTime.split(':')[0]);
                        let end = parseInt(session.endTime.split(':')[0]);
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

    matrixSelectedSlots.forEach(slot => {
        let parts = slot.split('-');
        let courtId = parts[0]; 
        let h = parseInt(parts[1]);
        
        courtNamesSet.add(courtId.replace('san', 'Sân '));
        hoursSet.add(h);

        if (h >= 17 && h <= 20) { totalCourtPrice += 120000; hasGoldenHour = true; } 
        else { totalCourtPrice += 80000; }
    });

    let sortedHours = Array.from(hoursSet).sort((a,b)=>a-b);
    let displayStartTime = (sortedHours[0] < 10 ? '0'+sortedHours[0] : sortedHours[0]) + ":00";
    let displayEndTime = ((sortedHours[sortedHours.length-1]+1) < 10 ? '0'+(sortedHours[sortedHours.length-1]+1) : (sortedHours[sortedHours.length-1]+1)) + ":00";
    let timeNote = hasGoldenHour ? "(Có Giờ Vàng)" : "(Giờ thường)";
    let totalMins = matrixSelectedSlots.length * 60; 

    let totalServicePrice = 0; let servicesList = [];
    const SECURE_PRICELIST = { "Trà đá": 10000, "Thuê vợt": 50000, "Ống cầu": 180000 };
    document.querySelectorAll('.service-item:checked').forEach(item => {
        if (SECURE_PRICELIST[item.value]) { totalServicePrice += SECURE_PRICELIST[item.value]; servicesList.push(item.value); }
    });

    let totalPrice = (totalCourtPrice + totalServicePrice) * weeksToBook;

    pendingBookings = [];
    datesToBook.forEach(d => {
        matrixSelectedSlots.forEach(slot => {
            let parts = slot.split('-'); let courtId = parts[0]; let h = parseInt(parts[1]);
            pendingBookings.push({ 
                date: d, court: courtId, 
                startTime: (h < 10 ? '0'+h : h) + ":00", 
                endTime: (h+1 < 10 ? '0'+(h+1) : h+1) + ":00", 
                customerName: customerName, customerPhone: customerPhone 
            });
        });
    });

    document.getElementById('ticket-name').innerText = customerName;
    document.getElementById('ticket-contact').innerText = customerPhone;
    document.getElementById('ticket-date').innerHTML = isRecurring ? `🔥 CỐ ĐỊNH TỪ: ${new Date(selectedDate).toLocaleDateString('vi-VN')} đến ${new Date(datesToBook[3]).toLocaleDateString('vi-VN')}` : new Date(selectedDate).toLocaleDateString('vi-VN');
    document.getElementById('ticket-court').innerText = Array.from(courtNamesSet).join(", ");
    document.getElementById('ticket-time').innerText = `Từ ${displayStartTime} đến ${displayEndTime} (Tổng cộng: ${totalMins} phút) ${timeNote}`;
    document.getElementById('ticket-services').innerText = servicesList.length > 0 ? servicesList.join(", ") : "Không có";
    document.getElementById('ticket-total').innerText = totalPrice.toLocaleString('vi-VN');
    modalTotalAmount.innerText = totalPrice.toLocaleString('vi-VN');

    // --- BỔ SUNG: XỬ LÝ ẨN/HIỆN MÃ QR THEO PHƯƠNG THỨC THANH TOÁN ---
    const qrImage = document.querySelector('.qr-code-img') || document.getElementById('qr-image');
    const paymentInstruction = document.querySelector('.instruction') || document.getElementById('payment-instruction');
    
    if (paymentMethod === 'cash') {
        if (qrImage) qrImage.style.display = 'none'; 
        if (paymentInstruction) paymentInstruction.innerHTML = "💵 Vui lòng thanh toán tiền mặt tại quầy lễ tân trước khi nhận sân. Xin cảm ơn!<br><br><i style='color:#888;'>*Lưu ý: Bạn có thể chụp lại phiếu vé này để đối chiếu.</i>";
        confirmPaymentBtn.innerText = "Xác Nhận Đặt Sân";
    } else {
        if (qrImage) qrImage.style.display = 'inline-block'; 
        if (paymentInstruction) paymentInstruction.innerText = "📱 Quét mã bằng ứng dụng Ngân hàng hoặc Ví điện tử (Momo/ZaloPay).";
        confirmPaymentBtn.innerText = "Tôi Đã Thanh Toán";
    }

    openModal();
});

// ==========================================
// 6. XỬ LÝ THANH TOÁN & GHI NHẬN DATA
// ==========================================
cancelPaymentBtn.addEventListener('click', closeModal);
cancelModalX.addEventListener('click', closeModal);

confirmPaymentBtn.addEventListener('click', function() {
    closeModal(); 
    ticketDiv.style.display = 'block'; 
    
    if (typeof confetti !== "undefined") {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }

    alert("🎉 Đặt sân thành công! Hệ thống đã ghi nhận ca đặt sân của bạn.");
    
    if (pendingBookings.length > 0) {
        pendingBookings.forEach(booking => { bookedSessions.push(booking); });
        localStorage.setItem('akBadmintonDB', JSON.stringify(bookedSessions));
        pendingBookings = []; 
        
        spamCheck.count += 1;
        localStorage.setItem('akSpamCheck', JSON.stringify(spamCheck));
        
        // Đã sửa: Xóa hàm cũ gây lỗi, gọi hàm renderMatrix mới để reset bảng
        renderMatrix(); 
    }
});

// ==========================================
// 6.5 NÚT GỬI PHIẾU QUA ZALO CHO CHỦ SÂN
// ==========================================
const sendZaloBtn = document.getElementById('send-zalo-btn');
if (sendZaloBtn) {
    sendZaloBtn.addEventListener('click', function() {
        const cusName = document.getElementById('ticket-name').innerText;
        const cusPhone = document.getElementById('ticket-contact').innerText;
        const date = document.getElementById('ticket-date').innerText;
        const courts = document.getElementById('ticket-court').innerText;
        const time = document.getElementById('ticket-time').innerText;
        const total = document.getElementById('ticket-total').innerText;

        const message = `🏸 *PHIẾU ĐẶT SÂN AK BADMINTON*\n`
                      + `👤 Tên: ${cusName}\n`
                      + `📞 SĐT: ${cusPhone}\n`
                      + `📅 Ngày: ${date}\n`
                      + `⛳ Sân: ${courts}\n`
                      + `⏰ Giờ: ${time}\n`
                      + `💰 Tổng: ${total} VNĐ\n\n`
                      + `Nhờ Admin xác nhận giúp mình nhé!`;

        const YOUR_ZALO_PHONE = "84908107436"; 
        
        const zaloLink = `https://zalo.me/${YOUR_ZALO_PHONE}?text=${encodeURIComponent(message)}`;
        window.open(zaloLink, '_blank');
    });
}

// ==========================================
// 7. CỘNG ĐỒNG GHÉP KÈO (MATCHMAKING) - CÓ BẢO MẬT
// ==========================================
let matchPosts = JSON.parse(localStorage.getItem('akMatchPosts')) || [];
const matchForm = document.getElementById('match-form');
const matchBoard = document.getElementById('match-board');

function renderMatchPosts() {
    if (!matchBoard) return; 
    matchBoard.innerHTML = "";

    if (matchPosts.length === 0) {
        matchBoard.innerHTML = "<p style='text-align:center; color:#999;'>Chưa có ai tìm đồng đội lúc này. Hãy là người đầu tiên!</p>";
        return;
    }

    matchPosts.slice().reverse().forEach(function(post) {
        const safeName = escapeHTML(post.name);
        const safeTime = escapeHTML(post.time);
        const safeLevel = escapeHTML(post.level);
        const safePhone = escapeHTML(post.phone).replace(/\D/g,'');

        const cardHTML = `
            <div class="match-card">
                <div class="match-info">
                    <h4>🏸 ${safeName}</h4>
                    <p><strong>Thời gian/Địa điểm:</strong> ${safeTime}</p>
                    <span class="match-tag">${safeLevel}</span>
                </div>
                <a href="https://zalo.me/${safePhone}" target="_blank" class="contact-btn">Nhắn Zalo</a>
            </div>
        `;
        matchBoard.innerHTML += cardHTML;
    });
}
renderMatchPosts();

if (matchForm) {
    matchForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        const newPost = {
            name: document.getElementById('match-name').value,
            phone: document.getElementById('match-phone').value,
            level: document.getElementById('match-level').value,
            time: document.getElementById('match-time').value
        };
        matchPosts.push(newPost);
        localStorage.setItem('akMatchPosts', JSON.stringify(matchPosts));
        matchForm.reset();
        alert("Đã đăng tin tìm đồng đội thành công!");
        renderMatchPosts();
    });
}