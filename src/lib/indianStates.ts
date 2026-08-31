/**
 * Indian states and union territories, used for GST place-of-supply
 * logic: when the business's state matches the customer's state, tax
 * splits into CGST+SGST; when they differ, it's IGST instead. Also
 * carries the two-digit GST state code, since that's what actually
 * appears in a GSTIN's first two digits if you ever want to cross-check.
 */
export interface IndianState {
  name: string;
  gstCode: string;
}

export const INDIAN_STATES: IndianState[] = [
  { name: "Jammu and Kashmir", gstCode: "01" },
  { name: "Himachal Pradesh", gstCode: "02" },
  { name: "Punjab", gstCode: "03" },
  { name: "Chandigarh", gstCode: "04" },
  { name: "Uttarakhand", gstCode: "05" },
  { name: "Haryana", gstCode: "06" },
  { name: "Delhi", gstCode: "07" },
  { name: "Rajasthan", gstCode: "08" },
  { name: "Uttar Pradesh", gstCode: "09" },
  { name: "Bihar", gstCode: "10" },
  { name: "Sikkim", gstCode: "11" },
  { name: "Arunachal Pradesh", gstCode: "12" },
  { name: "Nagaland", gstCode: "13" },
  { name: "Manipur", gstCode: "14" },
  { name: "Mizoram", gstCode: "15" },
  { name: "Tripura", gstCode: "16" },
  { name: "Meghalaya", gstCode: "17" },
  { name: "Assam", gstCode: "18" },
  { name: "West Bengal", gstCode: "19" },
  { name: "Jharkhand", gstCode: "20" },
  { name: "Odisha", gstCode: "21" },
  { name: "Chhattisgarh", gstCode: "22" },
  { name: "Madhya Pradesh", gstCode: "23" },
  { name: "Gujarat", gstCode: "24" },
  { name: "Daman and Diu", gstCode: "25" },
  { name: "Dadra and Nagar Haveli", gstCode: "26" },
  { name: "Maharashtra", gstCode: "27" },
  { name: "Andhra Pradesh (Old)", gstCode: "28" },
  { name: "Karnataka", gstCode: "29" },
  { name: "Goa", gstCode: "30" },
  { name: "Lakshadweep", gstCode: "31" },
  { name: "Kerala", gstCode: "32" },
  { name: "Tamil Nadu", gstCode: "33" },
  { name: "Puducherry", gstCode: "34" },
  { name: "Andaman and Nicobar Islands", gstCode: "35" },
  { name: "Telangana", gstCode: "36" },
  { name: "Andhra Pradesh", gstCode: "37" },
  { name: "Ladakh", gstCode: "38" },
  { name: "Other Territory", gstCode: "97" },
];

export const INDIAN_STATE_NAMES = INDIAN_STATES.map((s) => s.name);
