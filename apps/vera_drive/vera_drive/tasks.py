import frappe
from frappe.utils import now_datetime
from vera_drive.google_drive import (
    get_all_ve_files, parse_filename,
    map_doc_type, map_category,
    map_to_vera_employee, detect_by_folder
)

def _detect_uploader(f):
    owners = f.get('owners', [])
    last_modifier = f.get('lastModifyingUser', {})
    uploaded_email = None
    uploaded_name = None
    detected_method = None

    if owners:
        raw_email = owners[0].get('emailAddress', '')
        raw_name = owners[0].get('displayName', '')
        vera_email, vera_name = map_to_vera_employee(raw_email)
        if vera_email:
            uploaded_email = vera_email
            uploaded_name = vera_name
            detected_method = 'drive_api'
        else:
            uploaded_email = raw_email
            uploaded_name = raw_name
            detected_method = 'drive_api_unknown'

    if not uploaded_email and last_modifier:
        raw_email = last_modifier.get('emailAddress', '')
        vera_email, vera_name = map_to_vera_employee(raw_email)
        if vera_email:
            uploaded_email = vera_email
            uploaded_name = vera_name
            detected_method = 'last_modifier'

    if not uploaded_email:
        folder_email, folder_name = detect_by_folder(
            f.get('folder_path', '')
        )
        if folder_email:
            uploaded_email = folder_email
            uploaded_name = folder_name
            detected_method = 'folder_path'

    return (
        uploaded_email or '',
        uploaded_name or 'Unknown',
        last_modifier.get('emailAddress', ''),
        last_modifier.get('displayName', ''),
        detected_method or ''
    )

def sync_drive_files():
    log = frappe.new_doc('VE Drive Sync Log')
    log.sync_time = now_datetime()
    try:
        files = get_all_ve_files()
        log.files_found = len(files)
        new_count = 0
        for f in files:
            if not frappe.db.exists(
                'VE Drive File',
                {'drive_file_id': f['id']}
            ):
                parsed = parse_filename(f['name'])
                doc = frappe.new_doc('VE Drive File')
                doc.file_name = f['name']
                doc.original_name = f['name']
                doc.drive_file_id = f['id']
                doc.drive_view_link = f.get('webViewLink', '')
                doc.drive_folder_path = f.get('folder_path', '')
                doc.category = map_category(
                    f.get('folder_path', '')
                )
                doc.doc_type = map_doc_type(
                    parsed.get('doc_type_raw', '')
                )
                doc.party_name = parsed.get('party_name', '')
                doc.file_date = parsed.get('file_date')
                doc.file_extension = (
                    f['name'].rsplit('.', 1)[-1].lower()
                    if '.' in f['name'] else ''
                )
                doc.status = 'New'
                doc.synced_on = now_datetime()

                (
                    doc.uploaded_by_email,
                    doc.uploaded_by_name,
                    doc.last_modified_by_email,
                    doc.last_modified_by_name,
                    doc.upload_detected_method
                ) = _detect_uploader(f)

                doc.insert(ignore_permissions=True)
                new_count += 1

        # Backfill existing records with no uploader (NULL or empty)
        existing_no_owner = frappe.db.sql(
            """SELECT name, drive_folder_path FROM `tabVE Drive File`
               WHERE uploaded_by_email IS NULL OR uploaded_by_email = ''""",
            as_dict=True
        )
        for record in existing_no_owner:
            folder_email, folder_name = detect_by_folder(
                record.get('drive_folder_path', '')
            )
            if folder_email:
                frappe.db.set_value(
                    'VE Drive File',
                    record['name'],
                    {
                        'uploaded_by_email': folder_email,
                        'uploaded_by_name': folder_name,
                        'upload_detected_method': 'folder_path'
                    }
                )

        log.files_new = new_count
        log.sync_status = 'Success'
        frappe.db.commit()
    except Exception as e:
        log.sync_status = 'Failed'
        log.error_log = str(e)
        frappe.log_error(str(e), 'VE Drive Sync')
    log.insert(ignore_permissions=True)
    frappe.db.commit()
