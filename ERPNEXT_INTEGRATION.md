# ERPNext Integration Guide

## Overview

The FleetTrack FMS now includes seamless integration with ERPNext, allowing you to automatically sync your fleet management data with your ERP system. This integration eliminates manual data entry and ensures real-time synchronization between systems.

## Features

### Supported Data Sync
- **Vehicles** → ERPNext Vehicle Master
- **Drivers** → ERPNext Employee Master
- **Fuel Transactions** → ERPNext Expense Claims
- **Maintenance Records** → ERPNext Asset Maintenance
- **Trips** → ERPNext Delivery Trips
- **Incidents** → ERPNext Custom Records

### Sync Options
- **Manual Sync**: On-demand synchronization
- **Auto-Sync**: Scheduled automatic synchronization (configurable interval)
- **Selective Sync**: Choose which data types to sync
- **Bi-directional**: Push data from FMS to ERPNext (pull support coming soon)

## Setup Instructions

### Step 1: Obtain ERPNext API Credentials

1. Log in to your ERPNext instance
2. Go to **User** → Your user profile
3. Scroll to **API Access**
4. Click **Generate Keys** or copy existing keys
5. Save both:
   - API Key
   - API Secret

### Step 2: Configure Integration in FleetTrack

1. Navigate to **Integrations** → **ERPNext** tab
2. Enter your configuration:
   - **ERPNext URL**: Your ERPNext instance URL (e.g., `https://your-company.erpnext.com`)
   - **API Key**: Paste your API Key
   - **API Secret**: Paste your API Secret

3. Configure **Sync Settings**:
   - Enable/disable specific data types
   - Set auto-sync interval (recommended: 30 minutes)
   - Enable/disable automatic synchronization

4. Click **Save Configuration**

### Step 3: Test Connection

1. After saving, click **Test Connection**
2. Wait for confirmation message
3. If successful, you're ready to sync!

### Step 4: Initial Sync

1. Click **Sync Now** to perform initial data synchronization
2. Monitor the progress in the **Recent Sync History** section
3. Review any errors in the sync logs

## Data Mapping

### Vehicle → ERPNext Vehicle
| FMS Field | ERPNext Field |
|-----------|---------------|
| plate_number | license_plate |
| make | make |
| model | model |
| year | year |
| vin | chassis_number |
| fuel_type | fuel_type |
| odometer_km | odometer |
| status | status |

### Driver → ERPNext Employee
| FMS Field | ERPNext Field |
|-----------|---------------|
| first_name, last_name | employee_name |
| email | personal_email |
| phone | cell_number |
| hire_date | date_of_joining |
| status | status |

### Fuel Transaction → ERPNext Expense Claim
| FMS Field | ERPNext Field |
|-----------|---------------|
| transaction_date | expense_date |
| fuel_cost | total_claimed_amount |
| fuel_amount_liters | description |
| vehicle | reference |

### Maintenance → ERPNext Asset Maintenance
| FMS Field | ERPNext Field |
|-----------|---------------|
| work_order_type | maintenance_type |
| status | maintenance_status |
| description | description |
| completed_at | completion_date |

## Customization

### Custom Field Mappings

You can customize which ERPNext DocTypes to use for each data type. Edit the `field_mappings` in the configuration:

```json
{
  "vehicle_doctype": "Vehicle",
  "driver_doctype": "Employee",
  "fuel_doctype": "Expense Claim",
  "maintenance_doctype": "Asset Maintenance",
  "trip_doctype": "Delivery Trip"
}
```

### Custom Workflows

The integration respects ERPNext workflows. Make sure your API user has appropriate permissions for the DocTypes you're syncing.

## Troubleshooting

### Connection Failed
- Verify your ERPNext URL is correct and accessible
- Check API credentials are valid
- Ensure your ERPNext user has API access enabled
- Check firewall/network connectivity

### Sync Errors
- Review error details in sync logs
- Verify required fields are present in FMS data
- Check ERPNext field permissions
- Ensure no duplicate records exist

### Partial Sync
- Some records may fail while others succeed
- Review `error_details` in sync logs
- Fix data issues and retry sync

## API Reference

### Endpoints

**Sync Data**
```bash
POST /functions/v1/erpnext-sync
{
  "action": "sync",
  "entityType": "vehicles" // or "all", "drivers", "fuel", "maintenance"
}
```

**Test Connection**
```bash
POST /functions/v1/erpnext-sync
{
  "action": "test"
}
```

### Response Format

**Success Response**
```json
{
  "success": true,
  "syncResults": {
    "vehicles": { "synced": 10, "failed": 0 },
    "drivers": { "synced": 5, "failed": 0 }
  },
  "totalSynced": 15,
  "totalFailed": 0
}
```

**Error Response**
```json
{
  "error": "Connection failed: Invalid credentials"
}
```

## Best Practices

1. **Test First**: Always test connection before enabling auto-sync
2. **Start Small**: Begin with one data type, then expand
3. **Monitor Logs**: Regularly check sync logs for issues
4. **Backup Data**: Ensure ERPNext backups before initial sync
5. **Schedule Wisely**: Set sync intervals during low-traffic periods
6. **Review Mappings**: Customize field mappings for your workflow

## Security

- API credentials are stored encrypted in the database
- All API calls use HTTPS
- Row-level security ensures only authorized users can configure
- Audit logs track all configuration changes

## Support

For issues or questions:
- Check sync logs for detailed error messages
- Review ERPNext logs for server-side errors
- Contact support with sync log IDs for assistance

## Roadmap

Coming soon:
- Bi-directional sync (ERPNext → FMS)
- Real-time webhooks
- Custom transformation rules
- Bulk update support
- Advanced conflict resolution
