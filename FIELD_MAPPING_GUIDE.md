# ERPNext Field Mapping Guide

## Overview

FleetTrack FMS allows you to **customize field mappings** so your data syncs to any ERPNext field names - **no matter what your ERPNext schema uses**.

## Why Custom Mapping?

Different ERPNext installations may have:
- Custom field names (e.g., `vehicle_number` instead of `license_plate`)
- Different DocTypes (e.g., `Asset` instead of `Vehicle`)
- Custom fields specific to your business
- Localized field names in different languages

## How It Works

### Default Mappings (Standard ERPNext)

Out of the box, FleetTrack uses standard ERPNext field names:

```javascript
Vehicle → ERPNext "Vehicle" DocType
  plate_number → license_plate
  make → make
  model → model
  vin → chassis_number

Driver → ERPNext "Employee" DocType
  first_name + last_name → employee_name
  email → personal_email
  phone → cell_number
```

### Customizing Mappings

Go to **Integrations** → **ERPNext** → Expand **"Advanced Field Mappings"**

You'll see mapping options for each data type:

## Vehicle Field Mappings

| FleetTrack Field | Default ERPNext Field | Customizable |
|------------------|----------------------|--------------|
| DocType | `Vehicle` | ✅ Change to any DocType |
| plate_number | `license_plate` | ✅ Map to any field |
| make | `make` | ✅ Map to any field |
| model | `model` | ✅ Map to any field |
| vin | `chassis_number` | ✅ Map to any field |

**Example:** If your ERPNext uses `vehicle_registration` instead of `license_plate`:
```
Plate Number Field: vehicle_registration
```

## Driver Field Mappings

| FleetTrack Field | Default ERPNext Field | Customizable |
|------------------|----------------------|--------------|
| DocType | `Employee` | ✅ Change to `Driver`, `Staff`, etc. |
| first_name + last_name | `employee_name` | ✅ Map to any field |
| email | `personal_email` | ✅ Map to any field |
| phone | `cell_number` | ✅ Map to any field |

**Example:** If you have a custom `Driver` DocType:
```
ERPNext DocType: Driver
Name Field: full_name
Email Field: email_address
Phone Field: mobile
```

## Fuel Transaction Mappings

| FleetTrack Field | Default ERPNext Field | Customizable |
|------------------|----------------------|--------------|
| DocType | `Expense Claim` | ✅ Change to custom DocType |
| fuel_cost | `total_claimed_amount` | ✅ Map to any field |
| transaction_date | `expense_date` | ✅ Map to any field |

**Example:** If you use custom `Fuel Purchase` DocType:
```
ERPNext DocType: Fuel Purchase
Amount Field: purchase_amount
Date Field: purchase_date
```

## Trip/GPS Data Mappings

| FleetTrack Field | Default ERPNext Field | Customizable |
|------------------|----------------------|--------------|
| DocType | `Delivery Trip` | ✅ Change to `Trip`, `Journey`, etc. |
| distance_km | `total_distance` | ✅ Map to any field |
| vehicle | `vehicle` | ✅ Map to any field |
| driver | `driver` | ✅ Map to any field |

## Alert & Incident Mappings

| FleetTrack Field | Default ERPNext Field | Customizable |
|------------------|----------------------|--------------|
| Alert DocType | `Issue` | ✅ Change to custom DocType |
| Incident DocType | `Issue` | ✅ Change to custom DocType |
| title | `subject` | ✅ Map to any field |
| severity | `priority` | ✅ Map to any field |

## Common Scenarios

### Scenario 1: Localized ERPNext (e.g., Spanish)

Your ERPNext uses Spanish field names:

```
Vehicle Mappings:
  Plate Number Field: numero_de_placa
  Make Field: marca
  Model Field: modelo
  VIN Field: numero_de_chasis
```

### Scenario 2: Custom DocTypes

You created custom DocTypes for your fleet:

```
Vehicle Mappings:
  ERPNext DocType: Fleet Asset
  Plate Number Field: asset_number
  Make Field: manufacturer
  
Driver Mappings:
  ERPNext DocType: Fleet Driver
  Name Field: driver_name
  Email Field: contact_email
```

### Scenario 3: Additional Custom Fields

You want to map to custom fields you added:

```
Vehicle Mappings:
  Plate Number Field: license_plate
  Make Field: make
  VIN Field: chassis_number
  
  (FleetTrack will still send all standard fields,
   ERPNext will map them to matching field names)
```

## How to Find Your ERPNext Field Names

1. **Go to ERPNext**
2. **Navigate to:** Customize → Customize Form
3. **Select DocType:** (e.g., Vehicle, Employee)
4. **View field list** - Look at the "Fieldname" column
5. **Copy exact field names** to FleetTrack mapping configuration

### Example Screenshot Reference:

```
ERPNext Customize Form: Vehicle
┌─────────────────┬──────────────────┐
│ Label           │ Fieldname        │
├─────────────────┼──────────────────┤
│ License Plate   │ license_plate    │ ← Use this
│ Make            │ make             │ ← Use this
│ Model           │ model            │ ← Use this
│ Chassis Number  │ chassis_number   │ ← Use this
└─────────────────┴──────────────────┘
```

## Testing Your Mappings

1. **Save** your custom field mappings
2. Click **Test Connection** to verify ERPNext connectivity
3. Click **Sync Now** and select one data type (e.g., Vehicles)
4. **Check ERPNext** to see if data appears correctly
5. **Review Sync Logs** in FleetTrack for any errors
6. **Adjust mappings** if needed and retry

## Troubleshooting

### Error: "Field does not exist"

**Problem:** ERPNext can't find the field name you specified

**Solution:** 
- Check spelling of field name (case-sensitive!)
- Verify field exists in ERPNext DocType
- Use exact "Fieldname" from ERPNext (not Label)

### Error: "DocType not found"

**Problem:** ERPNext doesn't have that DocType

**Solution:**
- Verify DocType name is correct
- Ensure DocType is enabled in ERPNext
- Check you have permission to access it

### Data appears in wrong fields

**Problem:** Mapping is incorrect

**Solution:**
- Review your field mappings
- Check ERPNext field types match data types
- Ensure field is writable (not read-only)

## Best Practices

1. **Start with Default Mappings**
   - Test with default mappings first
   - Only customize if your ERPNext differs

2. **Test One Type at a Time**
   - Configure and test vehicles first
   - Then move to drivers, fuel, etc.

3. **Document Your Mappings**
   - Keep a record of custom field names
   - Useful for troubleshooting and team reference

4. **Use Consistent Naming**
   - If you customize, be consistent across all types
   - Helps maintain the system long-term

5. **Validate in ERPNext**
   - Always check synced data appears correctly
   - Verify all fields populated as expected

## Support

If you encounter mapping issues:

1. Check sync logs for specific error messages
2. Verify field names in ERPNext Customize Form
3. Test with a single record first
4. Review ERPNext permissions for the user/API key

## Example: Complete Custom Mapping

Here's a complete example for a custom ERPNext setup:

```javascript
// Vehicle Mappings
ERPNext DocType: Fleet_Vehicle
Plate Number Field: registration_no
Make Field: manufacturer
Model Field: vehicle_model
VIN Field: vin_number

// Driver Mappings
ERPNext DocType: Driver_Master
Name Field: driver_full_name
Email Field: email_id
Phone Field: mobile_no

// Fuel Mappings
ERPNext DocType: Fuel_Purchase
Amount Field: total_cost
Date Field: refuel_date

// Trip Mappings
ERPNext DocType: Vehicle_Trip
Distance Field: distance_traveled
Vehicle Field: vehicle_no
Driver Field: driver_name
```

Save these mappings, sync, and FleetTrack will automatically use your custom field names!
