import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import logoSuperavit from '@/assets/logo-superavit.png'

export interface ExportOptions {
  filename?: string
  title?: string
  orientation?: 'portrait' | 'landscape'
  logo?: boolean
  includeFilters?: boolean
  onlyCards?: boolean
}

const addLogoToPDF = (doc: jsPDF, yPosition: number = 20): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          const maxWidth = 60;
          const maxHeight = 20;
          const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
          const width = img.width * ratio;
          const height = img.height * ratio;
          
          const x = (doc.internal.pageSize.getWidth() - width) / 2;
          
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, yPosition, width, height);
          resolve(yPosition + height + 10);
        } else {
          resolve(yPosition);
        }
      } catch (error) {
        console.error('Erro ao processar logo:', error);
        resolve(yPosition);
      }
    };
    
    img.onerror = () => {
      resolve(yPosition);
    };
    
    img.src = logoSuperavit;
  });
};

export async function exportToPDF(
  elementId: string, 
  options: ExportOptions = {}
) {
  const {
    filename = 'relatorio',
    title = 'Relatório',
    orientation = 'portrait',
    logo = true,
    includeFilters = true,
    onlyCards = false
  } = options

  try {
    const pdf = new jsPDF(orientation, 'mm', 'a4')
    let yPosition = 20

    // Adicionar logo se solicitado
    if (logo) {
      yPosition = await addLogoToPDF(pdf, yPosition);
    }

    // Adicionar título
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Adicionar data de geração
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' })
    yPosition += 20

    if (onlyCards) {
      // Exportar apenas os cards de estatísticas
      const cardsElements = document.querySelectorAll('[data-card-stat]');
      
      if (cardsElements.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Resumo Estatístico', 20, yPosition);
        yPosition += 12;
        
        // Adicionar linha divisória
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, yPosition, 190, yPosition);
        yPosition += 8;

        cardsElements.forEach((cardElement, index) => {
          const titleElement = cardElement.querySelector('[data-card-title]');
          const valueElement = cardElement.querySelector('[data-card-value]');
          const descElement = cardElement.querySelector('[data-card-description]');

          if (titleElement && valueElement) {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(titleElement.textContent || '', 25, yPosition);
            
            pdf.setFontSize(16);
            pdf.setTextColor(0, 102, 204);
            pdf.text(valueElement.textContent || '', 25, yPosition + 8);
            
            pdf.setTextColor(0, 0, 0);
            if (descElement) {
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');
              pdf.text(descElement.textContent || '', 25, yPosition + 15);
            }
            
            yPosition += 30;
            
            // Linha divisória leve entre cards
            if (index < cardsElements.length - 1) {
              pdf.setDrawColor(230, 230, 230);
              pdf.line(25, yPosition - 5, 185, yPosition - 5);
            }
          }
        });
      }
    } else {
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error(`Elemento com ID '${elementId}' não encontrado`)
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 170
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      if (yPosition + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage()
        yPosition = 20
      }

      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight)
    }

    pdf.save(`${filename}.pdf`)
    
    return true
  } catch (error) {
    console.error('Erro ao exportar PDF:', error)
    throw error
  }
}

export function exportTableToPDF(data: any[], columns: string[], title: string) {
  const pdf = new jsPDF()
  
  // Título
  pdf.setFontSize(16)
  pdf.text(title, 20, 20)
  
  // Data
  pdf.setFontSize(10)
  pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30)
  
  // Cabeçalhos da tabela
  let y = 50
  pdf.setFontSize(12)
  pdf.setFont(undefined, 'bold')
  
  let x = 20
  columns.forEach((column, index) => {
    pdf.text(column, x, y)
    x += 40
  })
  
  // Dados da tabela
  pdf.setFont(undefined, 'normal')
  pdf.setFontSize(10)
  y += 10
  
  data.forEach((row, rowIndex) => {
    if (y > 270) { // Nova página se necessário
      pdf.addPage()
      y = 20
    }
    
    x = 20
    columns.forEach((column, colIndex) => {
      const value = row[column.toLowerCase().replace(/\s+/g, '_')] || '-'
      pdf.text(String(value).substring(0, 15), x, y)
      x += 40
    })
    y += 8
  })
  
  pdf.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}