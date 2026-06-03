-- Seed website_articles
INSERT INTO website_articles (title, slug, excerpt, author, category, display_order, is_featured, is_visible, updated_at) VALUES
  (
    'Ban CHQS Phường Bình Phú tổ chức huấn luyện dân quân năm 2025',
    'ban-chqs-phuong-binh-phu-to-chuc-huan-luyen-dan-quan-nam-2025',
    'Ban CHQS Phường Bình Phú đã tổ chức thành công đợt huấn luyện dân quân năm 2025 với sự tham gia của 150 cán bộ chiến sĩ trên địa bàn phường.',
    'Ban biên tập', 'Hoạt động', 1, true, true, '2025-05-15'
  ),
  (
    'Kết quả kiểm tra sẵn sàng chiến đấu quý I/2025',
    'ket-qua-kiem-tra-san-sang-chien-dau-quy-i-2025',
    'Kết quả kiểm tra sẵn sàng chiến đấu quý I năm 2025 đạt loại Khá, vượt chỉ tiêu đề ra, ghi nhận sự nỗ lực của toàn đơn vị.',
    'Ban biên tập', 'Tin tức', 2, true, true, '2025-05-10'
  ),
  (
    'Thông báo về đợt nghĩa vụ quân sự năm 2025',
    'thong-bao-ve-dot-nghia-vu-quan-su-nam-2025',
    'Ban CHQS Phường Bình Phú thông báo kế hoạch tuyển chọn thanh niên tham gia nghĩa vụ quân sự năm 2025 với nhiều chính sách hỗ trợ mới.',
    'Ban biên tập', 'Thông báo', 3, false, true, '2025-05-08'
  ),
  (
    'Giao lưu văn nghệ chào mừng ngày Quân đội nhân dân Việt Nam',
    'giao-luu-van-nghe-chao-mung-ngay-quan-doi-nhan-dan-viet-nam',
    'Buổi giao lưu văn nghệ đã diễn ra sôi nổi với sự tham gia của các đơn vị dân quân trên địa bàn phường Bình Phú.',
    'Ban biên tập', 'Hoạt động', 4, false, true, '2025-04-30'
  ),
  (
    'Hội nghị tổng kết công tác quân sự địa phương năm 2024',
    'hoi-nghi-tong-ket-cong-tac-quan-su-dia-phuong-nam-2024',
    'Hội nghị đã đánh giá toàn diện kết quả công tác quân sự địa phương năm 2024 và đề ra phương hướng, nhiệm vụ năm 2025.',
    'Ban biên tập', 'Tin tức', 5, false, true, '2025-01-10'
  ),
  (
    'Triển khai Nghị định mới về chế độ, chính sách dân quân',
    'trien-khai-nghi-dinh-moi-ve-che-do-chinh-sach-dan-quan',
    'Ban CHQS tổ chức quán triệt và triển khai Nghị định số 72/2024/NĐ-CP về chế độ, chính sách đối với dân quân tự vệ.',
    'Ban biên tập', 'Văn bản pháp quy', 6, false, false, '2025-03-20'
  );

-- Seed website_documents
INSERT INTO website_documents (title, doc_number, issued_by, issued_date, category, file_size, file_type, status, display_order, is_visible) VALUES
  (
    'Kế hoạch huấn luyện dân quân năm 2025',
    'KH-01/2025', 'Ban CHQS Phường Bình Phú', '2025-01-15',
    'Nhiệm vụ', '1.2 MB', 'PDF', 'active', 1, true
  ),
  (
    'Quyết định thành lập Ban CHQS phường nhiệm kỳ 2024-2026',
    'QĐ-15/2024', 'UBND Phường Bình Phú', '2024-06-01',
    'Hành chính', '850 KB', 'DOCX', 'active', 2, true
  ),
  (
    'Nghị quyết về tăng cường công tác tuyên truyền quốc phòng',
    'NQ-08/2024', 'Đảng ủy Phường Bình Phú', '2024-11-20',
    'Tuyên truyền', '620 KB', 'PDF', 'new', 3, true
  ),
  (
    'Quy chế bảo mật thông tin trong lực lượng dân quân',
    'QC-03/2023', 'Ban CHQS Phường Bình Phú', '2023-03-10',
    'Bảo mật', '980 KB', 'PDF', 'expired', 4, true
  ),
  (
    'Thông tư về chế độ chính sách hậu cần cho dân quân',
    'TT-12/2024', 'Bộ Quốc phòng', '2024-08-15',
    'Hậu cần', '2.1 MB', 'PDF', 'active', 5, true
  ),
  (
    'Chỉ thị về nâng cao chất lượng huấn luyện năm 2025',
    'CT-02/2025', 'Ban CHQS Phường Bình Phú', '2025-02-01',
    'Nhiệm vụ', '745 KB', 'DOCX', 'new', 6, true
  );

-- Seed website_slides
INSERT INTO website_slides (name, description, display_order, is_featured, is_visible, updated_at) VALUES
  (
    'Banner chào mừng 80 năm Quân đội nhân dân',
    'Kỷ niệm 80 năm ngày thành lập Quân đội nhân dân Việt Nam',
    1, true, true, '2025-05-01'
  ),
  (
    'Hình ảnh huấn luyện dân quân 2025',
    'Đợt huấn luyện dân quân tháng 3 năm 2025',
    2, true, true, '2025-04-20'
  ),
  (
    'Lễ ra quân huấn luyện năm 2025',
    'Lễ ra quân huấn luyện dân quân năm 2025',
    3, false, true, '2025-03-15'
  ),
  (
    'Giao lưu thể thao các đơn vị dân quân',
    'Giải thể thao truyền thống các đơn vị dân quân Phường Bình Phú',
    4, false, false, '2025-02-10'
  );
