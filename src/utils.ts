import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee } from './types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const exportToExcel = (data: Employee[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(emp => ({
    "الاسم الثلاثي": emp.fullName,
    "اسم الأم": emp.motherName,
    "الرقم الوظيفي": emp.employeeId,
    "العنوان الوظيفي": emp.jobTitle,
    "الاختصاص": emp.specialization,
    "رقم الهاتف": emp.phone,
    "تاريخ التعيين": emp.appointmentDate,
    "الشهادة": emp.certificate,
    "الحالة الاجتماعية": emp.maritalStatus === 'married' ? 'متزوج' : emp.maritalStatus === 'divorced' ? 'مطلق' : emp.maritalStatus === 'widowed' ? 'أرمل' : 'أعزب',
    "المحطة": emp.station,
    "المحافظة": emp.residenceProvince,
    "القضاء": emp.residenceDistrict,
    "عدد الأطفال": emp.childrenCount
  })));
  
  // Set RTL for Excel
  if (!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'].push({ RTL: true });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الموظفين");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPDF = (data: Employee[], fileName: string) => {
  const element = document.createElement('div');
  element.dir = 'rtl';
  element.style.padding = '20px';
  element.style.fontFamily = 'Arial, sans-serif';
  
  const title = document.createElement('h1');
  title.innerText = fileName;
  title.style.textAlign = 'center';
  title.style.marginBottom = '20px';
  element.appendChild(title);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['الاسم', 'الرقم الوظيفي', 'العنوان الوظيفي', 'المحطة', 'الشهادة', 'الهاتف', 'تاريخ التعيين'].forEach(text => {
    const th = document.createElement('th');
    th.innerText = text;
    th.style.border = '1px solid #ddd';
    th.style.padding = '8px';
    th.style.backgroundColor = '#1e293b';
    th.style.color = 'white';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(emp => {
    const row = document.createElement('tr');
    [
      emp.fullName,
      emp.employeeId,
      emp.jobTitle,
      emp.station,
      emp.certificate,
      emp.phone,
      emp.appointmentDate
    ].forEach(text => {
      const td = document.createElement('td');
      td.innerText = String(text || '');
      td.style.border = '1px solid #ddd';
      td.style.padding = '8px';
      td.style.textAlign = 'right';
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  element.appendChild(table);

  const opt = {
    margin: 10,
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
  };

  html2pdf().set(opt).from(element).save();
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const importFromExcel = (file: File): Promise<Partial<Employee>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const employees: Partial<Employee>[] = json.map(row => ({
          fullName: row["الاسم الثلاثي"] || row["Name"] || "",
          motherName: row["اسم الأم"] || row["Mother Name"] || "",
          employeeId: String(row["الرقم الوظيفي"] || row["ID"] || ""),
          phone: String(row["رقم الهاتف"] || row["Phone"] || ""),
          appointmentDate: row["تاريخ التعيين"] || row["Date"] || "",
          certificate: row["الشهادة"] || row["Certificate"] || "بكالوريوس",
          specialization: row["الاختصاص"] || row["Specialization"] || "",
          jobTitle: row["العنوان الوظيفي"] || row["Job Title"] || "",
          maritalStatus: (row["الحالة الاجتماعية"] === 'متزوج' ? 'married' : 
                          row["الحالة الاجتماعية"] === 'مطلق' ? 'divorced' : 
                          row["الحالة الاجتماعية"] === 'أرمل' ? 'widowed' : 'single'),
          station: row["المحطة"] || row["Station"] || "",
          residenceProvince: row["المحافظة"] || row["Province"] || "بغداد",
          residenceDistrict: row["القضاء"] || row["District"] || "",
          section: "شعبة الرادار",
          images: { childrenIds: [] },
          childrenDetails: Array.from({ length: Number(row["عدد الأطفال"] || 0) }).map(() => ({
            name: '',
            nationalId: '',
            birthDate: ''
          }))
        }));
        resolve(employees);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
