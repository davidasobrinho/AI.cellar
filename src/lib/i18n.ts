// The app is written in English and shown in European Portuguese when the
// phone or browser is set to Portuguese, or when the person picks it.
// t('English text') returns the Portuguese for it, or the English when there is none.

export type Lang = 'en' | 'pt'

const KEY = 'private-sommelier:lang'

function initial(): Lang {
  // Tests check the English text, whatever the machine's language.
  if (import.meta.env.MODE === 'test') return 'en'
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'pt') return saved
  } catch {
    // Storage can be blocked; fall through to the browser's language.
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export const lang: Lang = initial()
export const locale = lang === 'pt' ? 'pt-PT' : 'en-GB'

// Switching reloads the page, so every screen picks up the new language at once.
export function setLang(next: Lang) {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Without storage the choice cannot be kept.
  }
  window.location.reload()
}

export function t(english: string, params: Record<string, string | number> = {}): string {
  const text = lang === 'pt' ? (PT[english] ?? english) : english
  return text.replace(/\{(\w+)\}/g, (_, name: string) => `${params[name] ?? ''}`)
}

// "1 year" or "3 years", in the current language.
export function years(n: number): string {
  return lang === 'pt' ? `${n} ${n === 1 ? 'ano' : 'anos'}` : `${n} ${n === 1 ? 'year' : 'years'}`
}

const PT: Record<string, string> = {
  // Menu and frame
  Cellar: 'Garrafeira',
  Journal: 'Diário',
  Sommelier: 'O meu palato',
  'Add a wine': 'Adicionar vinho',
  'Change the name at the top': 'Mudar o nome no topo',
  'Sealed with Portuguese cork · Porto': 'Selado com cortiça portuguesa · Porto',
  'Sign out': 'Terminar sessão',
  'Sign in with Google': 'Entrar com Google',
  'Sign in to see your cellars and the ones shared with you.': 'Entra para veres as tuas garrafeiras e as que partilham contigo.',
  'Loading…': 'A carregar…',
  'Loading your cellar…': 'A carregar a tua garrafeira…',
  Problem: 'Problema',
  Close: 'Fechar',
  'Name at the top of your app, for example CAVE MARIA': 'Nome no topo da tua app, por exemplo CAVE MARIA',
  'Name of the new cellar': 'Nome da nova garrafeira',
  Language: 'Idioma',

  // Adding a wine
  'Both start the same way: snap the label, or type it in.': 'Os dois começam igual: fotografa o rótulo ou escreve.',
  'I have this bottle': 'Tenho esta garrafa',
  'Add it to a cellar, to track it and know when to drink it.': 'Junta-a a uma garrafeira, para a acompanhar e saber quando a beber.',
  'I drank it, or want to': 'Bebi-o, ou quero beber',
  'Rate it, or save it for later. It goes in your journal and shapes your palate.':
    'Avalia-o ou guarda-o para depois. Vai para o teu diário e molda o teu palato.',

  // Cellar screen
  'All cellars': 'Todas',
  view: 'ver',
  'New cellar': 'Nova garrafeira',
  'Add showcase wines': 'Juntar vinhos de exemplo',
  Share: 'Partilhar',
  'Delete cellar': 'Apagar garrafeira',
  'Shared with you to look at. You cannot change it.': 'Partilhada contigo só para ver. Não a podes alterar.',
  'Delete the cellar "{name}" and its {count} wines? This cannot be undone.{note}':
    'Apagar a garrafeira "{name}" e os seus {count} vinhos? Não é possível desfazer.{note}',
  ' It will disappear for everyone it is shared with.': ' Vai desaparecer para todos com quem está partilhada.',
  Bottles: 'Garrafas',
  Wines: 'Vinhos',
  'Est. value': 'Valor est.',
  '{n} without price': '{n} sem preço',
  All: 'Todos',
  'Average bottle': 'Garrafa média',
  "Don't miss these": 'Não deixes passar',
  'Closing windows first': 'Primeiro as janelas a fechar',
  'All wines': 'Todos os vinhos',
  'Drinking timeline': 'Cronologia de consumo',
  wine: 'vinho',
  wines: 'vinhos',
  List: 'Lista',
  Timeline: 'Cronologia',
  'Drinking window': 'Janela de consumo',
  Peak: 'Auge',
  Today: 'Hoje',
  'No bottles here yet.': 'Ainda não há garrafas aqui.',
  Wine: 'Vinho',
  bottles: 'garrafas',

  // Sharing
  'Share {name}': 'Partilhar {name}',
  'They sign in with that Google account and the cellar appears in their app, next to their own.':
    'Entram com essa conta Google e a garrafeira aparece na app deles, ao lado das suas.',
  'Their Google email': 'O email Google da pessoa',
  'Can view': 'Pode ver',
  'Look only': 'Só ver',
  'Can edit': 'Pode editar',
  'Add, open, change': 'Juntar, abrir, alterar',
  'Shared with': 'Partilhada com',
  Remove: 'Remover',

  // Drinking status
  'Drink soon': 'Beber em breve',
  'At peak': 'No auge',
  Ready: 'Pronto',
  'Ready any time': 'Pronto a qualquer altura',
  Wait: 'Aguardar',
  'Past best': 'Passou o auge',
  Unknown: 'Desconhecido',
  'Past its peak and starting to fade. Open in the next year or so.': 'Passou o auge e começa a perder-se. Abre no próximo ano.',
  'Drinking at its best right now. A great moment to open it.': 'No seu melhor agora. Ótimo momento para o abrir.',
  'Drinkable now, but will still improve with a few more years.': 'Já se bebe, mas ainda melhora com mais uns anos.',
  'Still too young. Leave it in the cellar for now.': 'Ainda demasiado jovem. Deixa-o na garrafeira por agora.',
  'Likely beyond its window. Open one soon to check.': 'Provavelmente fora da janela. Abre um em breve para confirmar.',
  'Aged before bottling. It does not improve in the bottle.': 'Envelhecido antes de engarrafar. Não melhora na garrafa.',
  'Add a vintage to get an estimate.': 'Indica a colheita para obter uma estimativa.',
  'Open whenever you like': 'Abre quando quiseres',
  'No estimate yet': 'Ainda sem estimativa',
  'Ready in {n} ({year})': 'Pronto daqui a {n} ({year})',
  'Peaks in {n} ({year})': 'Atinge o auge daqui a {n} ({year})',
  'Last year at peak': 'Último ano no auge',
  'At peak until {year}': 'No auge até {year}',
  'Best before end of {year}': 'Melhor antes do fim de {year}',
  'Window closed in {year}': 'A janela fechou em {year}',

  // Wine types, levels and regions
  Red: 'Tinto',
  White: 'Branco',
  Sparkling: 'Espumante',
  'Vintage Port': 'Porto Vintage',
  'LBV Port': 'Porto LBV',
  'Tawny or other Port': 'Porto Tawny ou outro',
  Other: 'Outro',
  Everyday: 'Dia a dia',
  'Grande Reserva or top': 'Grande Reserva ou topo',
  'Outside Portugal': 'Fora de Portugal',

  // Prices
  'Below €10': 'Abaixo de 10 €',
  '€10 to €30': '10 € a 30 €',
  'More than €30': 'Mais de 30 €',
  'No price yet': 'Ainda sem preço',
  '{band} sticker': 'Autocolante {band}',
  'No price yet, so no sticker': 'Ainda sem preço, por isso sem autocolante',

  // Bottle sheet
  Drinkable: 'Bebível',
  'Drink by': 'Beber até',
  'Today · {year}': 'Hoje · {year}',
  'An estimate for this wine and vintage. It assumes good storage.': 'Estimativa para este vinho e colheita. Pressupõe boa conservação.',
  'An estimate from the style of the wine, not this producer or year. It assumes good storage.':
    'Estimativa pelo estilo do vinho, não por este produtor ou ano. Pressupõe boa conservação.',
  Structure: 'Estrutura',
  'Estimated for this wine.': 'Estimada para este vinho.',
  'Estimated from its type, region and level, not this producer.': 'Estimada pelo tipo, região e nível, não por este produtor.',
  Label: 'Rótulo',
  'Serve at': 'Servir a',
  Decant: 'Decantar',
  'Not needed': 'Não é preciso',
  'Front label': 'Rótulo',
  'Back label': 'Contrarrótulo',
  Designation: 'Denominação',
  Classification: 'Classificação',
  'Sub-region': 'Sub-região',
  Grapes: 'Castas',
  Ageing: 'Estágio',
  Alcohol: 'Álcool',
  Volume: 'Volume',
  Closure: 'Vedante',
  Lot: 'Lote',
  'Bottled by': 'Engarrafado por',
  'From the back label': 'Do contrarrótulo',
  'In your cellar': 'Na tua garrafeira',
  bottle: 'garrafa',
  'Price today': 'Preço atual',
  'Price paid': 'Preço pago',
  'Total value': 'Valor total',
  'Open a bottle': 'Abrir uma garrafa',
  Opened: 'Abertas',
  'This cellar is shared with you to look at. Only its owners can open or change bottles.':
    'Esta garrafeira está partilhada contigo só para ver. Só os donos podem abrir ou alterar garrafas.',
  'Occasion, food, what you thought': 'Ocasião, comida, o que achaste',
  Undo: 'Desfazer',
  Edit: 'Editar',
  'Remove {name} from the cellar?': 'Remover {name} da garrafeira?',

  // Bottle form
  'Edit bottle': 'Editar garrafa',
  'Add a bottle': 'Adicionar garrafa',
  'Photograph the front and back label, and the details are filled in for you to check.':
    'Fotografa o rótulo e o contrarrótulo, e os detalhes são preenchidos para confirmares.',
  'Label photos': 'Fotos do rótulo',
  'Remove photo': 'Remover foto',
  'Reading label…': 'A ler o rótulo…',
  'Read again': 'Ler de novo',
  'Read label': 'Ler rótulo',
  'Label read. The drinking window and serving notes are estimates. Check everything before saving.':
    'Rótulo lido. A janela de consumo e as notas de serviço são estimativas. Confirma tudo antes de guardar.',
  Producer: 'Produtor',
  Name: 'Nome',
  Vintage: 'Colheita',
  'No vintage': 'Sem colheita',
  Type: 'Tipo',
  Region: 'Região',
  Level: 'Nível',
  From: 'De',
  to: 'a',
  Until: 'Até',
  'Leave empty to use an estimate from the style of the wine': 'Deixa vazio para usar uma estimativa pelo estilo do vinho',
  ', shown in grey': ', a cinzento',
  'Price today (€)': 'Preço atual (€)',
  'Price paid (€)': 'Preço pago (€)',
  Location: 'Localização',
  Notes: 'Notas',
  'Save changes': 'Guardar alterações',
  'Add to cave': 'Juntar à cave',
  'The label could not be read. {why}': 'Não foi possível ler o rótulo. {why}',
  'That file could not be opened as an image.': 'Não foi possível abrir esse ficheiro como imagem.',
  'Fill in all four years of the drinking window, or leave them all empty.':
    'Preenche os quatro anos da janela de consumo, ou deixa-os todos vazios.',

  // Journal
  'Your journal': 'O teu diário',
  'Wines you drank or want to try. Add one with the + at the top: snap it, rate it now or save it for later. Every rating shapes your palate and the sommelier\'s advice.':
    'Vinhos que bebeste ou queres provar. Junta um com o + no topo: fotografa, avalia já ou guarda para depois. Cada avaliação molda o teu palato e as sugestões que recebes.',
  'All ({n})': 'Todos ({n})',
  'To buy ({n})': 'Para comprar ({n})',
  'Friends ({n})': 'Amigos ({n})',
  'Nothing saved to buy yet.': 'Ainda nada guardado para comprar.',
  'No wines yet. Snap the next one you enjoy.': 'Ainda sem vinhos. Fotografa o próximo de que gostares.',
  'Not tasted yet': 'Ainda não provado',
  'To buy': 'Para comprar',
  'Rate it': 'Avaliar',
  'From your cellar': 'Da tua garrafeira',
  'Remove {name} from your journal?': 'Remover {name} do teu diário?',
  'Friends you add can read your journal, not change it. You see theirs once they add you too. Your palate stays private.':
    'Os amigos que juntares podem ler o teu diário, não alterá-lo. Vês o deles quando também te juntarem. O teu palato continua privado.',
  'Add a friend': 'Juntar amigo',
  'Google account email of the friend who can read your journal': 'Email Google do amigo que pode ler o teu diário',
  'Stop sharing': 'Deixar de partilhar',
  'They can read your journal. Theirs shows here once they add you.': 'Já podem ler o teu diário. O deles aparece aqui quando te juntarem.',
  'No wines in their journal yet.': 'Ainda não há vinhos no diário deles.',
  'Saved for later': 'Guardado para depois',
  'Edit wine': 'Editar vinho',
  'A wine to remember': 'Um vinho a lembrar',
  "From anywhere: a restaurant, a shop shelf, a friend's table. Rate it now, or save it for later and rate it when you drink it.":
    'De qualquer lado: um restaurante, uma prateleira, a mesa de um amigo. Avalia já, ou guarda para depois e avalia quando o beberes.',
  'Reading the label…': 'A ler o rótulo…',
  'Fill in from a label photo': 'Preencher a partir de uma foto do rótulo',
  'Producer and wine': 'Produtor e vinho',
  'Your rating, if you have tasted it': 'A tua avaliação, se já o provaste',
  'What you thought': 'O que achaste',
  Where: 'Onde',
  "Restaurant, shop, friend's": 'Restaurante, loja, casa de amigo',
  'Price (€)': 'Preço (€)',
  'I want to buy this one': 'Quero comprar este',
  'Add to my journal': 'Juntar ao meu diário',
  'Save for later': 'Guardar para depois',
  '{n} out of 5 stars': '{n} de 5 estrelas',
  '{n} stars': '{n} estrelas',
  'Not rated': 'Sem avaliação',

  // Taste tags
  Fresh: 'Fresco',
  Elegant: 'Elegante',
  Fruity: 'Frutado',
  Smooth: 'Suave',
  Complex: 'Complexo',
  Powerful: 'Potente',
  'Too heavy': 'Demasiado pesado',
  'Too tannic': 'Demasiado tânico',
  'Too oaky': 'Demasiada madeira',
  'Too acidic': 'Demasiado ácido',
  'Too sweet': 'Demasiado doce',
  Thin: 'Aguado',

  // Palate
  'Your palate': 'O teu palato',
  "Example: João's palate": 'Exemplo: o palato do João',
  '{n} rated · {strength}': '{n} avaliados · {strength}',
  'Nothing to go on yet': 'Ainda sem dados',
  'A first sketch': 'Um primeiro esboço',
  'Taking shape': 'A ganhar forma',
  'A solid picture': 'Um retrato sólido',
  "Built from ten wines João's newsletter scored 5 out of 5, counted as liked. Their structure values are rough estimates.":
    'Feito a partir de dez vinhos com 5 em 5 na newsletter do João, contados como apreciados. Os valores de estrutura são estimativas aproximadas.',
  'Wines of 4 or 5 stars count as liked, 1 or 2 as disliked. A wine read from its label uses its own values; any other uses an estimate for its type and region.':
    'Vinhos com 4 ou 5 estrelas contam como apreciados, com 1 ou 2 como não apreciados. Um vinho lido do rótulo usa os seus próprios valores; os outros usam uma estimativa pelo tipo e região.',
  'Your palate graph appears here once you rate a wine.': 'O gráfico do teu palato aparece aqui quando avaliares um vinho.',
  'Back to mine': 'Voltar ao meu',
  'See an example': 'Ver um exemplo',
  'Your taste in your own words': 'O teu gosto, nas tuas palavras',
  'Describe your taste in your own words': 'Descreve o teu gosto nas tuas palavras',
  'I like fresh, elegant reds. Not much oak. No sweet wines. Rarely above €30 a bottle.':
    'Gosto de tintos frescos e elegantes. Pouca madeira. Nada de vinhos doces. Raramente acima de 30 € a garrafa.',
  'Saved when you leave the box. Private, even from friends. The sommelier treats firm rules here as firm.':
    'Guardado quando sais da caixa. Privado, mesmo para amigos. As sugestões respeitam as regras que aqui puseres.',
  Liked: 'Apreciados',
  Disliked: 'Não apreciados',
  Body: 'Corpo',
  Tannin: 'Taninos',
  Acidity: 'Acidez',
  Oak: 'Madeira',
  Fruit: 'Fruta',
  Maturity: 'Evolução',
  light: 'leves',
  'full-bodied': 'encorpados',
  soft: 'macios',
  'firm, tannic': 'firmes e tânicos',
  round: 'redondos',
  'fresh, high-acid': 'frescos e de acidez viva',
  unoaked: 'sem madeira',
  oaky: 'com muita madeira',
  'lean, savoury': 'austeros e salinos',
  'ripe, fruit-forward': 'maduros e frutados',
  young: 'jovens',
  aged: 'evoluídos',
  'You lean towards {x} wines.': 'Tens tendência para vinhos {x}.',
  'The wines you disliked were more {x} than the ones you liked.': 'Os vinhos de que não gostaste eram mais {x} do que os de que gostaste.',
  'Palate graph': 'Gráfico do palato',
  '{n} out of 5': '{n} de 5',

  // Sommelier
  'Your sommelier': 'O meu palato',
  'What to open, what to order, what to buy. For this meal and this moment.':
    'O que abrir, o que pedir, o que comprar. Para esta refeição e este momento.',
  'At home': 'Em casa',
  'Pick a bottle from my cellar': 'Escolhe uma garrafa da minha garrafeira',
  'At a restaurant': 'No restaurante',
  'Read the wine list for me': 'Lê a carta de vinhos por mim',
  Buying: 'A comprar',
  'Tell me what to look for': 'Diz-me o que procurar',
  'Where are you?': 'Onde estás?',
  'The wine list': 'A carta de vinhos',
  'Link to the menu': 'Link para a carta',
  'Paste the address the QR code opened': 'Cola o endereço que o código QR abriu',
  'Scan the QR code with the camera, open the menu, copy its address and paste it here. On Android you can also use Share and pick Cave Sobri. Reading a link uses two AI requests instead of one.':
    'Lê o código QR com a câmara, abre a carta, copia o endereço e cola-o aqui. No Android também podes usar Partilhar e escolher Cave Sobri. Ler um link gasta dois pedidos de IA em vez de um.',
  'Or paste the list': 'Ou cola a lista',
  'Select the wine section of the menu page, copy, and paste it here': 'Seleciona a parte dos vinhos na página da carta, copia e cola aqui',
  'Or photograph it': 'Ou fotografa-a',
  'Wine list page {n}': 'Página {n} da carta',
  'Add page': 'Juntar página',
  'What are you eating?': 'O que vais comer?',
  'Roast lamb with rosemary': 'Borrego assado com alecrim',
  Occasion: 'Ocasião',
  'Sunday lunch with family': 'Almoço de domingo em família',
  'Budget per bottle (€)': 'Orçamento por garrafa (€)',
  'The date, the time of day and the season are taken into account. So is your palate.':
    'A data, a hora do dia e a estação contam. E o teu palato também.',
  ' Your cellar is empty, so there is nothing to pick from yet.': ' A tua garrafeira está vazia, por isso ainda não há nada para escolher.',
  'Thinking…': 'A pensar…',
  'Ask the sommelier': 'Pedir sugestão',
  'The sommelier could not answer. {why}': 'Não foi possível obter uma sugestão. {why}',
  'Top pick': 'Escolha principal',
  Alternative: 'Alternativa',
  'Open its sheet': 'Abrir a ficha',
  'Based on your taste': 'Com base no teu gosto',
  'Nothing personal yet, so this is general advice. Rate some wines in your Journal to change that.':
    'Ainda nada pessoal, por isso é um conselho geral. Avalia alguns vinhos no teu Diário para mudar isso.',
  'Advice from an AI model. It can be wrong, so trust your own taste.': 'Conselho de um modelo de IA. Pode errar, por isso confia no teu gosto.',

  // AI errors
  'No answer after 60 seconds.': 'Sem resposta após 60 segundos.',
  'The AI models are busy right now. Try again in a minute.': 'Os modelos de IA estão ocupados. Tenta de novo daqui a um minuto.',
  "Today's free AI allowance is used up. It resets within a day.": 'Acabou a quota gratuita de IA de hoje. Renova-se dentro de um dia.',
  'No wine list could be read at that link. Try pasting the list instead.':
    'Não foi possível ler uma carta de vinhos nesse link. Experimenta colar a lista.',

  // Showcase cellar
  "João's 5-star picks": 'Escolhas 5 estrelas do João',
  'Main cellar': 'Garrafeira principal',
  'The sommelier is not switched on here. It needs the Firebase project.': 'As sugestões não estão ligadas aqui. Precisam do projeto Firebase.',
}
