import frappe, os, io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SERVICE_ACCOUNT_FILE = os.path.join(
    os.path.dirname(__file__), 'service_account.json'
)
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
ROOT_FOLDER_ID = '1tuZUNAScIAR7IX3sttH6VgKkQNsy5IDu'

VERA_EMPLOYEES = {
    'maazdgr8.mma@gmail.com': 'Maaz',
    'lookman.vera@outlook.com': 'Lookman',
    'manju.veraaccnts@outlook.com': 'Manjunath M N',
    'bhagyashree.veraenterprises@outlook.com': 'Bhagya Shree',
    'owais@veraenterprises.in': 'Owais Ahmed Khan',
}

FOLDER_OWNER_MAP = {
    '01_Sales': 'maazdgr8.mma@gmail.com',
    '02_Purchase': 'lookman.vera@outlook.com',
    '03_Accounts': 'manju.veraaccnts@outlook.com',
    '04_HR_Payroll': 'bhagyashree.veraenterprises@outlook.com',
    '05_Logistics': 'lookman.vera@outlook.com',
}

_NAME_HINTS = {
    'maaz': ('maazdgr8.mma@gmail.com', 'Maaz'),
    'lookman': ('lookman.vera@outlook.com', 'Lookman'),
    'manjunath': ('manju.veraaccnts@outlook.com', 'Manjunath M N'),
    'manju': ('manju.veraaccnts@outlook.com', 'Manjunath M N'),
    'bhagya': ('bhagyashree.veraenterprises@outlook.com', 'Bhagya Shree'),
    'owais': ('owais@veraenterprises.in', 'Owais Ahmed Khan'),
}

def map_to_vera_employee(email):
    if not email:
        return None, None
    email_lower = email.lower().strip()
    for vera_email, name in VERA_EMPLOYEES.items():
        if email_lower == vera_email.lower():
            return vera_email, name
    for hint, (vera_email, name) in _NAME_HINTS.items():
        if hint in email_lower:
            return vera_email, name
    return None, None

def detect_by_folder(folder_path):
    for folder_key, email in FOLDER_OWNER_MAP.items():
        if folder_key in folder_path:
            name = VERA_EMPLOYEES.get(email, 'Unknown')
            return email, name
    return None, None

def get_drive_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build('drive', 'v3', credentials=creds)

def list_files_in_folder(service, folder_id):
    results, page_token = [], None
    while True:
        resp = service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            spaces='drive',
            fields='nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents,owners(displayName,emailAddress),lastModifyingUser(displayName,emailAddress))',
            pageToken=page_token
        ).execute()
        results.extend(resp.get('files', []))
        page_token = resp.get('nextPageToken')
        if not page_token:
            break
    return results

def get_all_ve_files():
    service = get_drive_service()
    all_files = []
    def recurse(folder_id, path):
        for item in list_files_in_folder(service, folder_id):
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                recurse(item['id'], path + '/' + item['name'])
            else:
                item['folder_path'] = path
                all_files.append(item)
    recurse(ROOT_FOLDER_ID, 'Vera Enterprises \u2014 Documents')
    return all_files

def parse_filename(filename):
    name = filename.rsplit('.', 1)[0]
    parts = name.split('_')
    result = {
        'file_date': None,
        'doc_type_raw': None,
        'party_name': None,
        'direction': None
    }
    if len(parts) >= 1 and len(parts[0]) == 8 and parts[0].isdigit():
        d = parts[0]
        result['file_date'] = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    if len(parts) >= 2:
        result['doc_type_raw'] = parts[1]
    if len(parts) >= 4:
        if parts[2].upper() == 'VE':
            result['direction'] = 'outgoing'
            result['party_name'] = parts[3]
        elif parts[-1].upper() == 'VE':
            result['direction'] = 'incoming'
            result['party_name'] = parts[2]
    elif len(parts) == 3 and parts[2].upper() == 'VE':
        result['direction'] = 'internal'
    return result

def map_doc_type(raw):
    m = {
        'SalesInvoice': 'Sales Invoice',
        'SalesOrder': 'Sales Order',
        'Quotation': 'Quotation',
        'DeliveryNote': 'Delivery Note',
        'Receipt': 'Receipt',
        'CreditNote': 'Credit Note',
        'PurchaseInvoice': 'Purchase Invoice',
        'PurchaseOrder': 'Purchase Order',
        'GRN': 'GRN',
        'DeliveryCert': 'Delivery Certificate',
        'Payment': 'Payment',
        'DebitNote': 'Debit Note',
        'TrialBalance': 'Trial Balance',
        'ProfitLoss': 'Profit & Loss',
        'BalanceSheet': 'Balance Sheet',
        'BankRecon': 'Bank Reconciliation',
        'Ledger': 'Ledger',
        'Daybook': 'Daybook',
        'SalarySlip': 'Salary Slip',
        'Attendance': 'Attendance',
        'PayrollSummary': 'Payroll Summary',
        'TransportDoc': 'Transport Doc',
        'PackingList': 'Packing List',
        'StockReport': 'Stock Report',
        'StockJournal': 'Stock Journal',
        'Contra': 'Contra',
        'Journal': 'Journal'
    }
    return m.get(raw, raw or 'Other')

def map_category(path):
    if '01_Sales' in path: return 'Sales'
    if '02_Purchase' in path: return 'Purchase'
    if '03_Accounts' in path: return 'Accounts'
    if '04_HR' in path: return 'HR'
    if '05_Logistics' in path: return 'Logistics'
    return 'Other'

def download_file_content(file_id):
    service = get_drive_service()
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    fh.seek(0)
    return fh
