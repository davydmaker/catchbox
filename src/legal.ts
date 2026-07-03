// Terms of Use and Privacy Policy content for CatchBox.
// Rendered as HTML into the legal modals. Kept out of i18n.ts because the
// content is long-form HTML rather than short interface strings.

const COMPANY = 'Beater Studios';
const COMPANY_URL = 'https://beaterstudios.com';
const CONTACT_EMAIL = 'studiosbeater@gmail.com';
const LAST_UPDATED = { pt: '3 de julho de 2026', en: 'July 3, 2026' };

const termsPt = `
  <h2>Termos de Uso</h2>
  <p class="legal-updated">Última atualização: ${LAST_UPDATED.pt}</p>

  <h3>1. Aceitação dos termos</h3>
  <p>Ao acessar ou usar o CatchBox ("Serviço"), você concorda com estes Termos de Uso. Se você não concordar, não utilize o Serviço. O CatchBox é operado por ${COMPANY} (<a href="${COMPANY_URL}" target="_blank" rel="noopener">${COMPANY_URL}</a>).</p>

  <h3>2. Descrição do Serviço</h3>
  <p>O CatchBox é um rastreador de Pokédex gratuito e não oficial, feito por fãs, que permite acompanhar quais Pokémon você capturou em cada jogo. Os dados de Pokémon são fornecidos pela <a href="https://pokeapi.co/" target="_blank" rel="noopener">PokeAPI</a>.</p>

  <h3>3. Conta e login</h3>
  <p>O uso básico do CatchBox não exige cadastro. Opcionalmente, você pode entrar com sua Conta Google para sincronizar seu progresso entre dispositivos. Você é responsável por manter a segurança da sua conta Google e por toda atividade realizada por meio dela.</p>

  <h3>4. Uso aceitável</h3>
  <p>Você concorda em não utilizar o Serviço para fins ilegais, em não tentar acessar dados de outros usuários, sobrecarregar a infraestrutura, realizar engenharia reversa com fins maliciosos ou interferir no funcionamento do Serviço.</p>

  <h3>5. Propriedade intelectual</h3>
  <p>O CatchBox é um projeto não oficial, feito por fãs. Não é afiliado, endossado ou patrocinado pela Nintendo, Game Freak, Creatures Inc. ou The Pokémon Company. Pokémon e todos os nomes relacionados são marcas registradas de seus respectivos proprietários. O código e o design originais do CatchBox pertencem a ${COMPANY}.</p>

  <h3>6. Serviços de terceiros</h3>
  <p>O Serviço depende de serviços de terceiros, incluindo PokeAPI (dados de Pokémon) e Google Firebase (autenticação e sincronização). O uso desses serviços está sujeito às respectivas políticas e termos. Não nos responsabilizamos por indisponibilidade ou alterações nesses serviços.</p>

  <h3>7. Disponibilidade e garantias</h3>
  <p>O Serviço é fornecido "no estado em que se encontra" e "conforme disponível", sem garantias de qualquer tipo. Não garantimos que o Serviço estará sempre disponível, livre de erros ou que os dados sincronizados não serão perdidos.</p>

  <h3>8. Limitação de responsabilidade</h3>
  <p>Na máxima extensão permitida por lei, ${COMPANY} não será responsável por quaisquer danos indiretos, incidentais ou consequenciais decorrentes do uso ou da impossibilidade de uso do Serviço, incluindo perda de dados de progresso.</p>

  <h3>9. Alterações nos termos</h3>
  <p>Podemos atualizar estes Termos periodicamente. O uso continuado do Serviço após alterações constitui aceitação dos novos termos. Recomendamos revisar esta página ocasionalmente.</p>

  <h3>10. Contato</h3>
  <p>Dúvidas sobre estes Termos podem ser enviadas para <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`;

const termsEn = `
  <h2>Terms of Use</h2>
  <p class="legal-updated">Last updated: ${LAST_UPDATED.en}</p>

  <h3>1. Acceptance of terms</h3>
  <p>By accessing or using CatchBox (the "Service"), you agree to these Terms of Use. If you do not agree, do not use the Service. CatchBox is operated by ${COMPANY} (<a href="${COMPANY_URL}" target="_blank" rel="noopener">${COMPANY_URL}</a>).</p>

  <h3>2. Description of the Service</h3>
  <p>CatchBox is a free, unofficial, fan-made Pokédex tracker that lets you keep track of which Pokémon you have caught in each game. Pokémon data is provided by <a href="https://pokeapi.co/" target="_blank" rel="noopener">PokeAPI</a>.</p>

  <h3>3. Account and sign-in</h3>
  <p>Basic use of CatchBox does not require an account. Optionally, you may sign in with your Google Account to sync your progress across devices. You are responsible for keeping your Google Account secure and for all activity performed through it.</p>

  <h3>4. Acceptable use</h3>
  <p>You agree not to use the Service for any unlawful purpose, not to attempt to access other users' data, not to overload the infrastructure, not to reverse engineer it for malicious purposes, and not to interfere with the operation of the Service.</p>

  <h3>5. Intellectual property</h3>
  <p>CatchBox is an unofficial, fan-made project. It is not affiliated with, endorsed, or sponsored by Nintendo, Game Freak, Creatures Inc., or The Pokémon Company. Pokémon and all related names are trademarks of their respective owners. The original CatchBox code and design belong to ${COMPANY}.</p>

  <h3>6. Third-party services</h3>
  <p>The Service relies on third-party services, including PokeAPI (Pokémon data) and Google Firebase (authentication and sync). Use of these services is subject to their respective policies and terms. We are not responsible for the unavailability of, or changes to, those services.</p>

  <h3>7. Availability and warranties</h3>
  <p>The Service is provided on an "as is" and "as available" basis, without warranties of any kind. We do not guarantee that the Service will always be available, error-free, or that synced data will not be lost.</p>

  <h3>8. Limitation of liability</h3>
  <p>To the maximum extent permitted by law, ${COMPANY} shall not be liable for any indirect, incidental, or consequential damages arising from the use of or inability to use the Service, including loss of progress data.</p>

  <h3>9. Changes to the terms</h3>
  <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms. We recommend reviewing this page occasionally.</p>

  <h3>10. Contact</h3>
  <p>Questions about these Terms may be sent to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`;

const privacyPt = `
  <h2>Política de Privacidade</h2>
  <p class="legal-updated">Última atualização: ${LAST_UPDATED.pt}</p>

  <p>Esta Política descreve como o CatchBox, operado por ${COMPANY}, coleta, usa e protege suas informações.</p>

  <h3>1. Dados que coletamos</h3>
  <p>Você pode usar o CatchBox sem criar conta — nesse caso, seu progresso fica apenas no seu dispositivo. Se você optar por entrar com o Google, coletamos:</p>
  <ul>
    <li><strong>Dados da Conta Google:</strong> nome, endereço de e-mail, foto de perfil e identificador de usuário (UID), fornecidos pelo Google no login.</li>
    <li><strong>Progresso e preferências:</strong> os Pokémon que você marcou como capturados e suas configurações (idioma, estilo de sprite, modo de gênero).</li>
  </ul>
  <p>Não coletamos dados de pagamento e não exibimos anúncios.</p>

  <h3>2. Como usamos seus dados</h3>
  <p>Usamos os dados exclusivamente para autenticar você e sincronizar seu progresso e preferências entre seus dispositivos. Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins de marketing.</p>

  <h3>3. Armazenamento e provedores</h3>
  <ul>
    <li><strong>No seu dispositivo:</strong> progresso e configurações são salvos localmente (localStorage). O Service Worker também armazena em cache sprites e dados da PokeAPI para uso offline.</li>
    <li><strong>Na nuvem (opcional):</strong> se você entrar com o Google, seu progresso e configurações são armazenados no Google Firebase (Authentication e Cloud Firestore). O acesso é restrito à sua própria conta por regras de segurança.</li>
  </ul>

  <h3>4. Serviços de terceiros</h3>
  <p>Utilizamos <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Google Firebase</a> para login e sincronização e <a href="https://pokeapi.co/" target="_blank" rel="noopener">PokeAPI</a> para dados de Pokémon. Esses serviços possuem suas próprias políticas de privacidade.</p>

  <h3>5. Cookies e tecnologias locais</h3>
  <p>Não usamos cookies de rastreamento ou publicidade. Utilizamos apenas armazenamento local (localStorage) e cache do Service Worker, necessários para o funcionamento do app, além dos mecanismos de sessão do Firebase quando você faz login.</p>

  <h3>6. Compartilhamento de progresso</h3>
  <p>O recurso de compartilhamento gera um link que contém seu progresso codificado na própria URL. Ao compartilhar esse link, qualquer pessoa com ele poderá ver e importar esse progresso. Compartilhe apenas com quem você confia.</p>

  <h3>7. Retenção e exclusão</h3>
  <p>Seus dados na nuvem são mantidos enquanto sua conta existir. Você pode limpar os dados locais pelo próprio navegador. Para solicitar a exclusão dos seus dados armazenados na nuvem, envie um e-mail para <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h3>8. Crianças</h3>
  <p>O CatchBox não se destina a coletar dados pessoais de crianças. Se você acredita que uma criança nos forneceu dados sem consentimento, entre em contato para que possamos removê-los.</p>

  <h3>9. Seus direitos</h3>
  <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais, bem como retirar o consentimento a qualquer momento, saindo da conta ou entrando em contato conosco.</p>

  <h3>10. Alterações nesta Política</h3>
  <p>Podemos atualizar esta Política periodicamente. Alterações relevantes serão refletidas nesta página com uma nova data de atualização.</p>

  <h3>11. Contato</h3>
  <p>Para dúvidas sobre privacidade, escreva para <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`;

const privacyEn = `
  <h2>Privacy Policy</h2>
  <p class="legal-updated">Last updated: ${LAST_UPDATED.en}</p>

  <p>This Policy describes how CatchBox, operated by ${COMPANY}, collects, uses, and protects your information.</p>

  <h3>1. Data we collect</h3>
  <p>You can use CatchBox without creating an account — in that case, your progress stays only on your device. If you choose to sign in with Google, we collect:</p>
  <ul>
    <li><strong>Google Account data:</strong> name, email address, profile picture, and user identifier (UID), provided by Google at sign-in.</li>
    <li><strong>Progress and preferences:</strong> the Pokémon you marked as caught and your settings (language, sprite style, gender mode).</li>
  </ul>
  <p>We do not collect payment data and we do not show ads.</p>

  <h3>2. How we use your data</h3>
  <p>We use your data solely to authenticate you and to sync your progress and preferences across your devices. We do not sell, rent, or share your data with third parties for marketing purposes.</p>

  <h3>3. Storage and providers</h3>
  <ul>
    <li><strong>On your device:</strong> progress and settings are saved locally (localStorage). The Service Worker also caches sprites and PokeAPI data for offline use.</li>
    <li><strong>In the cloud (optional):</strong> if you sign in with Google, your progress and settings are stored in Google Firebase (Authentication and Cloud Firestore). Access is restricted to your own account by security rules.</li>
  </ul>

  <h3>4. Third-party services</h3>
  <p>We use <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Google Firebase</a> for sign-in and sync, and <a href="https://pokeapi.co/" target="_blank" rel="noopener">PokeAPI</a> for Pokémon data. These services have their own privacy policies.</p>

  <h3>5. Cookies and local technologies</h3>
  <p>We do not use tracking or advertising cookies. We only use local storage (localStorage) and Service Worker caching, which are necessary for the app to work, plus Firebase session mechanisms when you sign in.</p>

  <h3>6. Sharing progress</h3>
  <p>The share feature generates a link that contains your progress encoded in the URL itself. By sharing that link, anyone who has it can view and import that progress. Only share it with people you trust.</p>

  <h3>7. Retention and deletion</h3>
  <p>Your cloud data is kept as long as your account exists. You can clear local data through your browser. To request deletion of your cloud-stored data, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h3>8. Children</h3>
  <p>CatchBox is not intended to collect personal data from children. If you believe a child has provided us data without consent, please contact us so we can remove it.</p>

  <h3>9. Your rights</h3>
  <p>You may request access to, correction of, or deletion of your personal data, and withdraw consent at any time by signing out or contacting us.</p>

  <h3>10. Changes to this Policy</h3>
  <p>We may update this Policy from time to time. Material changes will be reflected on this page with a new update date.</p>

  <h3>11. Contact</h3>
  <p>For privacy questions, write to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`;

export function getTermsHtml(lang: string): string {
  return lang === 'en' ? termsEn : termsPt;
}

export function getPrivacyHtml(lang: string): string {
  return lang === 'en' ? privacyEn : privacyPt;
}
