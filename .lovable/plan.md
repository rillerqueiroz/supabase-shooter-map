

## Plano: Remover atualização de `valor_pago` no processamento

O campo `valor_pago` da planilha está sendo gravado no banco ao processar títulos. O objetivo é preservar o valor original do banco, não sobrescrevendo com o da planilha.

### Alterações em `src/pages/UploadPagosOficial.tsx`

1. **`handleProcessItems` (~linha 317-318):** Remover `valor_pago: pago.valor_pago` do objeto `updates`
2. **`handleProcessItems` (~linha 335):** Remover a linha de alterações que registra mudança de `valor_pago` no relatório
3. **Processamento individual (~linha 458-459):** Remover `valor_pago: pago.valor_pago` do objeto `updates` no segundo bloco de processamento

O campo `valor_pago` da planilha continuará sendo exibido na interface para comparação visual, mas **não será gravado** no banco de dados ao processar.

