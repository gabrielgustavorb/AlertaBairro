# AlertaBairro — versão completa de demonstração/piloto

Funcionalidades: registro de ocorrências; categorias; descrição; foto/câmera; GPS; endereço por CEP; ViaCEP; geocodificação; mapa Leaflet/OpenStreetMap; busca e filtros; confirmações comunitárias; contador; ordenação; status Recebido/Em análise/Resolvido; estatísticas; exclusão; layout responsivo.

## Publicação
Abra no VS Code com Live Server para testar. Depois:
git add .
git commit -m "Versão completa do AlertaBairro"
git push

O Vercel conectado ao GitHub fará o deploy.

## Importante
Esta versão é um protótipo funcional/piloto. As ocorrências ficam no localStorage do navegador. Portanto, aparelhos diferentes não compartilham automaticamente os dados. Para produção multiusuário, a próxima etapa é backend + banco de dados + autenticação.