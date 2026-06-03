# Tổng quan hệ thống

## Vai trò người dùng

| Vai trò | Mô tả ngắn |
|---------|------------|
| DQTT | Quản lý hoạt động, task, hồ sơ tuổi 17 |
| DQCD | Thực hiện task được giao, xem lịch/KPI của mình |
| CHI_HUY | Chỉ huy, quyền quản lý rộng |
| TO_TRUONG | Tổ trưởng, xem lịch rộng hơn DQCD |
| ADMIN | Quản trị phòng ban, người dùng |

## Module chính

- **Hoạt động & nhiệm vụ**: `/api/activities`, `/api/activities-task`
- **Lịch**: `/api/calendar`
- **Nhân sự tuổi 17**: `/api/youth`
- **Nguồn / QNDB**: `/api/nguon`, `/api/qndb`
- **KPI**: `/api/kpi`
- **FAQ**: `/api/faq`
- **Chat trợ lý**: `/api/chat` (dùng knowledge base)

## Cập nhật knowledge base

Thêm hoặc sửa file `.md` / `.txt` trong thư mục `knowledge-base/`, khởi động lại server (hoặc gọi lại chat) để trợ lý đọc nội dung mới.
