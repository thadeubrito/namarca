import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './privacy.module.css'

export const metadata: Metadata = {
  title: 'Privacidade | namarca',
  description: 'Como a Namarca trata fotos, dados de navegação e contatos.',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" aria-label="namarca — página inicial">namarca</Link></header>
    <main className={styles.content} id="conteudo">
      <h1>Privacidade</h1>
      <p className={styles.intro}>Sua foto e a imagem que você cria ficam no seu navegador. Você decide se quer salvar ou compartilhar.</p>
      <section aria-labelledby="fotos"><h2 id="fotos">Fotos e composições</h2>
        <p>A Namarca não envia a foto selecionada nem a composição para seus servidores ou para ferramentas de métricas. A edição acontece no dispositivo, sem cadastro do participante.</p>
        <p>Ao sair ou recarregar a página, a edição é perdida. Se você usar o compartilhamento do dispositivo, o arquivo será entregue ao aplicativo que escolher e estará sujeito às regras desse serviço. Não há postagem automática.</p>
      </section>
      <section aria-labelledby="navegacao"><h2 id="navegacao">Dados de navegação</h2>
        <p>Ao acessar o site, a infraestrutura que entrega as páginas e os materiais recebe dados técnicos da conexão, como endereço IP e informações do navegador. Isso é diferente de receber sua foto ou composição.</p>
      </section>
      <section aria-labelledby="metricas"><h2 id="metricas">Métricas de uso</h2>
        <p>A coleta de métricas com o PostHog está desativada. A integração preparada mede ações como abrir uma campanha, começar a editar e gerar uma imagem, além de falhas técnicas, para entender e melhorar a experiência.</p>
        <p>Essa integração não usa cookies de análise, gravação de sessões ou identificação persistente. Não inclui fotos, composições, nomes de arquivos, contatos, dados de pagamento ou parâmetros dos links nos eventos. Um identificador aleatório em memória vale apenas enquanto a página está aberta.</p>
        <p>Se a coleta for ativada, o PostHog também receberá dados da conexão, como o endereço IP. Desabilitar a localização por IP não torna a conexão anônima. A integração respeita os sinais Do Not Track e Global Privacy Control do navegador.</p>
        <p>Antes da ativação, este aviso será atualizado com as condições aplicáveis, incluindo base legal e prazo de retenção.</p>
      </section>
      <section aria-labelledby="contato"><h2 id="contato">Contato e seus direitos</h2>
        <p>Se você conversar com a Namarca pelo WhatsApp, receberemos os dados que compartilhar nessa conversa. O WhatsApp também trata dados conforme sua própria política de privacidade.</p>
        <p>Para dúvidas sobre privacidade ou para solicitar acesso, correção, exclusão de dados ou oposição a um tratamento, <a href="https://wa.me/5547992901925" rel="noreferrer">fale com a Namarca pelo WhatsApp</a>. Não envie fotos ou documentos sensíveis para fazer uma pergunta inicial.</p>
      </section>
    </main>
    <footer className={styles.footer}><Link href="/">Voltar ao site</Link></footer>
  </div>
}
