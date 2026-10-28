<?php
/**
 * Documentos legales fijos (RELATÓRIO MÉDICO E JUSTIFICATIVA DE EXAME
 * ESPECIALIZADO) para Dinamômetro/Estesiômetro/Equilíbrio dentro de Pedidos.
 *
 * Mismo patrón que Laudos (api/laudos/signed-pdf.php): el PDF firmado se
 * arma ENTERAMENTE en el servidor con TCPDF writeHTML() — texto vectorial
 * real, con SetAutoPageBreak nativo — en vez de capturar el HTML del
 * navegador. El texto es idéntico al que usa PrintSpecializedExamTemplate.tsx
 * (que sigue sirviendo para "Imprimir" nativo sin firmar); se mantiene en
 * los dos lugares a propósito, mismo trade-off que Laudos.
 */

$SPECIALIZED_EXAM_DOCS = [
  'din-01' => [
    'examTitle' => 'DINAMOMETRIA MUSCULAR DE MEMBROS SUPERIORES BILATERAL',
    'finalidade' => 'Avaliação Neurológica, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exame solicitado',
    'examSolicitado' => 'Dinamometria muscular de membros superiores bilateral, com avaliação quantitativa da força muscular, análise comparativa entre os membros direito e esquerdo e emissão de laudo médico interpretativo especializado.',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de dinamometria muscular bilateral dos membros superiores, com a finalidade de obter parâmetros objetivos, quantitativos e reprodutíveis da força muscular, permitindo a investigação de possíveis déficits motores, assimetrias funcionais e comprometimentos neuromusculares.'],
      ['k' => 'p', 't' => 'A avaliação dinamométrica constitui método complementar de mensuração da força muscular, particularmente útil na análise da força de preensão palmar e, conforme o equipamento utilizado, de grupos musculares específicos dos membros superiores.'],
      ['k' => 'p', 't' => 'O exame poderá contribuir para a investigação e o acompanhamento de alterações motoras associadas a neuropatias periféricas, polineuropatias inflamatórias e desmielinizantes, radiculopatias cervicais, síndromes compressivas de nervos periféricos, miopatias, doenças do neurônio motor, sequelas neurológicas centrais e afecções musculoesqueléticas.'],
      ['k' => 'p', 't' => 'Sua realização justifica-se pela necessidade de documentar quantitativamente a função motora, permitindo correlação com a semiologia neurológica, exame físico e demais exames complementares, quando disponíveis.'],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA NEUROLÓGICA E FUNCIONAL'],
      ['k' => 'p', 't' => 'A mensuração da força muscular dos membros superiores apresenta relevância na avaliação de possíveis alterações do sistema nervoso central, sistema nervoso periférico, unidade motora e aparelho musculoesquelético.'],
      ['k' => 'p', 't' => 'Solicita-se avaliação dos seguintes parâmetros:'],
      ['k' => 'ol', 'items' => [
        'Força de preensão palmar bilateral.',
        'Comparação quantitativa entre os membros superiores direito e esquerdo.',
        'Identificação de possíveis assimetrias de força muscular.',
        'Avaliação de grupos musculares específicos, quando clinicamente indicada e tecnicamente disponível.',
        'Análise da influência da dominância manual sobre os resultados.',
        'Investigação de possíveis limitações funcionais relacionadas à redução da força muscular.',
        'Documentação objetiva para acompanhamento evolutivo e avaliação da resposta terapêutica.',
      ]],
      ['k' => 'p', 't' => 'A interpretação deverá considerar fatores como idade, sexo, dominância manual, presença de dor, limitações articulares, fadiga, condições clínicas e metodologia utilizada.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA PARA LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que o exame seja acompanhado de laudo médico interpretativo, preferencialmente elaborado e assinado por médico especialista em uma das seguintes áreas:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos resultados com a semiologia neurológica, investigação de déficits motores, neuropatias periféricas, radiculopatias cervicais, doenças neuromusculares e comprometimentos do sistema nervoso central.'],
      ['k' => 'sh', 't' => 'II – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para avaliação de alterações musculoesqueléticas, comprometimentos articulares, lesões musculotendíneas e limitações biomecânicas capazes de interferir na produção de força muscular.'],
      ['k' => 'sh', 't' => 'III – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para interpretação da capacidade funcional, desempenho muscular, limitações motoras, repercussões nas atividades de vida diária e necessidades de reabilitação.'],
      ['k' => 'p', 't' => 'A necessidade de interpretação médica especializada fundamenta-se na importância de distinguir déficits de força de origem neurogênica, miopática, musculoesquelética ou associados a fatores álgicos e funcionais.'],
      ['k' => 'p', 't' => 'A mensuração dinamométrica isolada não estabelece diagnóstico etiológico e não substitui a avaliação médica especializada.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'O exame também possui finalidade médico-pericial, visando à obtenção de dados objetivos que possam subsidiar a análise da capacidade funcional dos membros superiores.'],
      ['k' => 'p', 't' => 'A documentação quantitativa da força muscular poderá contribuir para a caracterização de alterações motoras, acompanhamento evolutivo e investigação de limitações funcionais com possíveis repercussões nas atividades habituais e profissionais.'],
      ['k' => 'p', 't' => 'Para essa finalidade, os resultados deverão ser interpretados em conjunto com a história clínica, exame físico, exames complementares e exigências específicas da atividade laborativa.'],
      ['k' => 'p', 't' => 'Ressalta-se que a dinamometria, isoladamente, não comprova incapacidade laborativa, incapacidade permanente ou grau de deficiência, sendo necessária avaliação médico-pericial abrangente.'],

      ['k' => 'h', 't' => '5. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação do equipamento e protocolo de avaliação.',
        'Valores quantitativos da força muscular dos membros superiores, com unidades de medida.',
        'Mensuração da força de preensão palmar direita e esquerda.',
        'Registro de medidas repetidas e análise da variabilidade dos resultados.',
        'Comparação bilateral, considerando a dominância manual.',
        'Identificação e quantificação de possíveis assimetrias ou déficits de força.',
        'Interpretação em relação aos parâmetros de referência apropriados, quando disponíveis.',
        'Descrição de fatores que possam interferir nas mensurações.',
        'Correlação clínica e análise das possíveis repercussões funcionais.',
        'Conclusão médica fundamentada, com identificação profissional, CRM, especialidade e assinatura do médico responsável.',
      ]],

      ['k' => 'h', 't' => '6. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação objetiva da força muscular e de documentação funcional, justifico e solicito a realização de DINAMOMETRIA MUSCULAR DE MEMBROS SUPERIORES BILATERAL, acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a emissão do laudo por médico especialista em NEUROLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, funcional e médico-pericial da avaliação.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de mensuração dinamométrica e o laudo médico interpretativo possuem finalidades distintas. A interpretação médica especializada é solicitada para proporcionar adequada correlação clínico-funcional, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
    ],
  ],

  'din-02' => [
    'examTitle' => 'DINAMOMETRIA MUSCULAR DE MEMBROS INFERIORES BILATERAL',
    'finalidade' => 'Avaliação Neurológica, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exame solicitado',
    'examSolicitado' => 'Dinamometria muscular de membros inferiores bilateral, com avaliação quantitativa da força muscular, análise comparativa entre os membros direito e esquerdo e emissão de laudo médico interpretativo especializado.',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de dinamometria muscular bilateral dos membros inferiores, com a finalidade de obter parâmetros objetivos, quantitativos e reprodutíveis da força muscular, permitindo a investigação de possíveis déficits motores, assimetrias funcionais, comprometimentos neuromusculares e alterações da capacidade locomotora.'],
      ['k' => 'p', 't' => 'A dinamometria constitui método complementar de avaliação funcional, possibilitando a mensuração instrumental da força produzida por diferentes grupos musculares dos membros inferiores, de acordo com o equipamento e o protocolo técnico empregados.'],
      ['k' => 'p', 't' => 'O exame poderá contribuir para a investigação e o acompanhamento de alterações motoras associadas a polineuropatias periféricas, neuropatias inflamatórias e desmielinizantes, radiculopatias lombossacras, miopatias, doenças do neurônio motor, sequelas de doenças cerebrovasculares, lesões neurológicas centrais e afecções musculoesqueléticas.'],
      ['k' => 'p', 't' => 'Sua realização justifica-se pela necessidade de documentar quantitativamente a função motora dos membros inferiores, permitindo correlação com a semiologia neurológica, exame musculoesquelético, avaliação da marcha e demais exames complementares, quando disponíveis.'],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA NEUROLÓGICA E FUNCIONAL'],
      ['k' => 'p', 't' => 'A mensuração da força muscular dos membros inferiores apresenta relevância na avaliação de possíveis alterações do sistema nervoso central, sistema nervoso periférico, unidade motora e aparelho locomotor.'],
      ['k' => 'p', 't' => 'Solicita-se, quando clinicamente indicado e tecnicamente possível, avaliação dos seguintes parâmetros:'],
      ['k' => 'ol', 'items' => [
        'Força muscular dos flexores e extensores do quadril, para análise do desempenho muscular proximal.',
        'Força muscular dos abdutores e adutores do quadril, considerando sua participação na estabilidade pélvica e no controle postural.',
        'Força de extensão dos joelhos, com avaliação predominante do grupo muscular quadríceps femoral.',
        'Força de flexão dos joelhos, com avaliação dos músculos isquiotibiais.',
        'Força de dorsiflexão dos tornozelos, considerando a função dos músculos dorsiflexores durante a marcha.',
        'Força de flexão plantar dos tornozelos, relacionada à propulsão e à estabilidade durante a locomoção.',
        'Comparação quantitativa bilateral, para identificação de possíveis assimetrias entre os membros inferiores.',
        'Análise das repercussões funcionais, especialmente sobre marcha, equilíbrio, transferências posturais e mobilidade.',
      ]],
      ['k' => 'p', 't' => 'A interpretação deverá considerar idade, sexo, composição corporal, condições clínicas, presença de dor, fadiga, limitações articulares, capacidade de execução e metodologia utilizada.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA PARA LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que o exame seja acompanhado de laudo médico interpretativo, preferencialmente elaborado e assinado por médico especialista em uma das seguintes áreas:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos resultados com a semiologia neurológica, investigação de paresias, déficits motores segmentares, neuropatias periféricas, polineuropatias, radiculopatias lombossacras, miopatias e doenças neuromusculares.'],
      ['k' => 'p', 't' => 'A interpretação neurológica deverá considerar, quando disponíveis, os achados relacionados à força muscular segmentar, trofismo, tônus muscular, reflexos osteotendíneos, sensibilidade superficial e profunda, coordenação motora e padrão da marcha.'],
      ['k' => 'sh', 't' => 'II – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para avaliação de alterações musculoesqueléticas, comprometimentos osteoarticulares, lesões musculotendíneas, doenças degenerativas da coluna vertebral e limitações biomecânicas capazes de interferir na produção de força muscular e na capacidade locomotora.'],
      ['k' => 'sh', 't' => 'III – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para interpretação da capacidade funcional, desempenho muscular, limitações motoras, alterações da marcha, equilíbrio, mobilidade, independência funcional e necessidades de reabilitação.'],
      ['k' => 'p', 't' => 'A necessidade de interpretação médica especializada fundamenta-se na importância de diferenciar déficits de força de origem neurogênica, miopática, musculoesquelética ou associados a fatores álgicos e funcionais.'],
      ['k' => 'p', 't' => 'A mensuração dinamométrica isolada não estabelece diagnóstico etiológico e não substitui a avaliação médica especializada.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'O exame também possui finalidade médico-pericial, visando à obtenção de dados objetivos que possam subsidiar a análise da capacidade funcional dos membros inferiores e de possíveis repercussões sobre as atividades habituais e laborativas.'],
      ['k' => 'p', 't' => 'A documentação quantitativa da força muscular poderá contribuir para:'],
      ['k' => 'ol', 'items' => [
        'Identificação e quantificação de déficits de força muscular.',
        'Caracterização de assimetrias motoras entre os membros inferiores.',
        'Investigação de alterações funcionais relacionadas a doenças neurológicas e musculoesqueléticas.',
        'Avaliação das possíveis repercussões dos déficits musculares sobre a marcha e a locomoção.',
        'Acompanhamento evolutivo de doenças neuromusculares.',
        'Documentação de parâmetros motores relevantes para avaliações médico-periciais.',
        'Monitoramento da resposta terapêutica e de programas de reabilitação.',
        'Subsídio à análise da capacidade funcional e laborativa, considerando as exigências específicas da atividade profissional.',
      ]],
      ['k' => 'p', 't' => 'Para essa finalidade, os resultados deverão ser interpretados em conjunto com a história clínica, exame neurológico, exame musculoesquelético, avaliação funcional, exames complementares e características da atividade laboral.'],
      ['k' => 'p', 't' => 'Ressalta-se que a dinamometria, isoladamente, não comprova incapacidade laborativa, incapacidade permanente ou grau de deficiência, sendo necessária avaliação clínica e médico-pericial abrangente.'],

      ['k' => 'h', 't' => '5. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação do equipamento, metodologia e protocolo técnico utilizados.',
        'Valores quantitativos da força muscular dos membros inferiores, com identificação das unidades de medida.',
        'Mensuração bilateral dos principais grupos musculares avaliados.',
        'Registro de medidas repetidas e análise da variabilidade dos resultados.',
        'Comparação entre os membros inferiores direito e esquerdo.',
        'Identificação e quantificação de possíveis assimetrias ou déficits musculares.',
        'Interpretação em relação aos parâmetros de referência apropriados à idade, sexo e metodologia empregada, quando disponíveis.',
        'Descrição de fatores capazes de interferir nas mensurações, incluindo dor, fadiga, limitações articulares e dificuldade de execução.',
        'Correlação clínica e análise das possíveis repercussões funcionais sobre a marcha, equilíbrio e mobilidade.',
        'Conclusão médica fundamentada, com identificação profissional, número do CRM, especialidade e assinatura do médico responsável.',
      ]],

      ['k' => 'h', 't' => '6. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação objetiva da força muscular, caracterização de possíveis déficits motores e documentação funcional, justifico e solicito a realização de DINAMOMETRIA MUSCULAR DE MEMBROS INFERIORES BILATERAL, acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a emissão do laudo por médico especialista em NEUROLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, funcional e médico-pericial da avaliação.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de mensuração dinamométrica e o laudo médico interpretativo possuem finalidades distintas.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada é solicitada para proporcionar adequada correlação clínico-funcional, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
      ['k' => 'p', 't' => 'A presente solicitação tem por objetivo assegurar uma avaliação quantitativa, padronizada e tecnicamente fundamentada da força muscular dos membros inferiores, com especial atenção às repercussões neurológicas, musculoesqueléticas e funcionais sobre a capacidade de locomoção do paciente.'],
    ],
  ],

  'din-03' => [
    'examTitle' => 'DINAMOMETRIA MUSCULAR DOS QUATRO MEMBROS (SUPERIORES E INFERIORES) BILATERAL',
    'finalidade' => 'Avaliação Neurológica, Neuromuscular, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exame solicitado',
    'examSolicitado' => 'Dinamometria muscular dos quatro membros, compreendendo membros superiores direito e esquerdo e membros inferiores direito e esquerdo, com mensuração quantitativa da força muscular, avaliação comparativa bilateral, análise funcional segmentar e emissão de laudo médico interpretativo especializado.',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de DINAMOMETRIA MUSCULAR DOS QUATRO MEMBROS, com a finalidade de obter parâmetros objetivos, quantitativos, padronizados e reprodutíveis da força muscular dos membros superiores e inferiores.'],
      ['k' => 'p', 't' => 'A avaliação destina-se a subsidiar a investigação de possíveis déficits motores, assimetrias de força, alterações do desempenho neuromuscular, comprometimentos funcionais e repercussões motoras decorrentes de doenças neurológicas, neuromusculares e musculoesqueléticas.'],
      ['k' => 'p', 't' => 'A dinamometria constitui método complementar de avaliação funcional, permitindo mensurar instrumentalmente a força muscular e documentar alterações que possam estar relacionadas a comprometimentos do sistema nervoso central, sistema nervoso periférico, unidade motora e aparelho locomotor.'],
      ['k' => 'p', 't' => 'O exame poderá contribuir para a investigação, caracterização e acompanhamento de condições clínicas como:'],
      ['k' => 'ol', 'items' => [
        'Polineuropatias periféricas, incluindo neuropatias inflamatórias e desmielinizantes.',
        'Radiculopatias cervicais, torácicas e lombossacras, conforme manifestações clínicas.',
        'Neuropatias compressivas e lesões de nervos periféricos.',
        'Miopatias inflamatórias, metabólicas e outras doenças musculares.',
        'Doenças do neurônio motor e alterações da unidade motora.',
        'Paresias, hemiparesias, paraparesias e tetraparesias.',
        'Sequelas motoras de acidentes vasculares cerebrais e outras lesões do sistema nervoso central.',
        'Doenças degenerativas da coluna vertebral com possível repercussão neurológica.',
        'Alterações musculotendíneas, osteoarticulares e biomecânicas.',
        'Déficits de força muscular associados a limitações das atividades de vida diária e da capacidade funcional.',
      ]],
      ['k' => 'p', 't' => 'Sua realização justifica-se pela necessidade de documentar quantitativamente a função motora global e segmentar, permitindo correlação com a semiologia neurológica, exame musculoesquelético, avaliação funcional e exames complementares, quando disponíveis.'],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA NEUROLÓGICA E FUNCIONAL DOS MEMBROS SUPERIORES'],
      ['k' => 'p', 't' => 'Solicito avaliação dinamométrica bilateral dos membros superiores, contemplando, conforme indicação clínica e capacidade técnica do equipamento:'],
      ['k' => 'ol', 'items' => [
        'Força de preensão palmar: mensuração da força de preensão das mãos direita e esquerda.',
        'Flexão e extensão dos punhos: avaliação dos grupos musculares flexores e extensores.',
        'Flexão dos cotovelos: avaliação da força dos músculos flexores, incluindo o bíceps braquial.',
        'Extensão dos cotovelos: avaliação da força dos músculos extensores, incluindo o tríceps braquial.',
        'Abdução e flexão dos ombros: avaliação de grupos musculares proximais.',
        'Comparação bilateral: identificação de possíveis assimetrias entre os membros superiores.',
        'Análise funcional: investigação das repercussões de eventuais déficits de força sobre atividades manuais, manipulação de objetos, sustentação de cargas e desempenho das atividades habituais.',
      ]],
      ['k' => 'p', 't' => 'A avaliação deverá considerar idade, sexo, dominância manual, condições clínicas, dor, fadiga, limitações articulares e protocolo utilizado.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA NEUROLÓGICA E FUNCIONAL DOS MEMBROS INFERIORES'],
      ['k' => 'p', 't' => 'Solicito avaliação dinamométrica bilateral dos membros inferiores, contemplando, conforme indicação clínica e capacidade técnica do equipamento:'],
      ['k' => 'ol', 'items' => [
        'Flexão e extensão dos quadris: avaliação da força muscular proximal.',
        'Abdução e adução dos quadris: avaliação dos grupos musculares relacionados à estabilidade pélvica.',
        'Extensão dos joelhos: avaliação da força do quadríceps femoral.',
        'Flexão dos joelhos: avaliação da força dos músculos isquiotibiais.',
        'Dorsiflexão dos tornozelos: avaliação dos músculos dorsiflexores, relevantes para a fase de balanço da marcha.',
        'Flexão plantar dos tornozelos: avaliação dos grupos musculares relacionados à propulsão durante a marcha.',
        'Comparação bilateral: identificação de assimetrias e possíveis déficits musculares.',
        'Análise funcional: investigação das repercussões sobre marcha, equilíbrio, mobilidade, transferências posturais, subida de escadas e capacidade locomotora.',
      ]],
      ['k' => 'p', 't' => 'A interpretação deverá considerar fatores como idade, sexo, composição corporal, presença de dor, fadiga, limitações articulares e condições neurológicas e musculoesqueléticas.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA PARA LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que a dinamometria dos quatro membros seja acompanhada de LAUDO MÉDICO INTERPRETATIVO ESPECIALIZADO, preferencialmente elaborado e assinado por médico especialista em uma das seguintes áreas:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos resultados com a semiologia neurológica, investigação de déficits motores, neuropatias periféricas, polineuropatias, radiculopatias, miopatias, doenças neuromusculares e comprometimentos do sistema nervoso central.'],
      ['k' => 'p', 't' => 'A interpretação neurológica deverá considerar, quando disponíveis, os achados do exame físico relacionados à força muscular segmentar, trofismo, tônus muscular, reflexos osteotendíneos, sensibilidade superficial e profunda, coordenação motora e padrão da marcha.'],
      ['k' => 'sh', 't' => 'II – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para avaliação de alterações musculoesqueléticas, comprometimentos articulares, lesões musculotendíneas, doenças degenerativas da coluna vertebral, alterações biomecânicas e limitações funcionais que possam interferir na produção de força muscular dos quatro membros.'],
      ['k' => 'sh', 't' => 'III – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para interpretação da capacidade funcional global, desempenho muscular, limitações motoras, alterações da marcha, equilíbrio, mobilidade, independência funcional e necessidades de reabilitação.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada justifica-se pela necessidade de diferenciar déficits de força de origem neurogênica, miopática, musculoesquelética ou associados a fatores álgicos e funcionais.'],
      ['k' => 'p', 't' => 'A mensuração dinamométrica isolada não estabelece diagnóstico etiológico e não substitui a avaliação médica especializada.'],

      ['k' => 'h', 't' => '5. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'A presente solicitação possui também finalidade médico-pericial, visando à obtenção de parâmetros quantitativos e reprodutíveis que possam subsidiar a análise da capacidade funcional dos quatro membros.'],
      ['k' => 'p', 't' => 'A documentação dinamométrica poderá contribuir para:'],
      ['k' => 'ol', 'items' => [
        'Identificação e quantificação de possíveis déficits de força muscular.',
        'Caracterização de assimetrias motoras entre os lados direito e esquerdo.',
        'Investigação de comprometimentos motores proximais e distais.',
        'Acompanhamento evolutivo de doenças neurológicas e musculoesqueléticas.',
        'Análise das possíveis repercussões funcionais sobre atividades manuais e capacidade de locomoção.',
        'Documentação objetiva de alterações motoras relevantes para avaliações médico-periciais.',
        'Monitoramento da resposta terapêutica e de programas de reabilitação.',
        'Subsídio à análise da capacidade funcional e laborativa, considerando as exigências específicas da atividade profissional.',
      ]],
      ['k' => 'p', 't' => 'Para essa finalidade, os resultados deverão ser interpretados em conjunto com a história clínica, exame neurológico, exame musculoesquelético, avaliação funcional, exames complementares e características das atividades habituais e laborativas.'],
      ['k' => 'p', 't' => 'Ressalta-se que a dinamometria, isoladamente, não comprova incapacidade laborativa, incapacidade permanente ou grau de deficiência, sendo necessária avaliação clínica e médico-pericial abrangente.'],

      ['k' => 'h', 't' => '6. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação do equipamento, metodologia e protocolo técnico empregados.',
        'Valores quantitativos da força muscular dos quatro membros, com identificação das unidades de medida.',
        'Mensuração bilateral dos principais grupos musculares avaliados.',
        'Registro de medidas repetidas, incluindo valores obtidos e análise da variabilidade.',
        'Comparação entre os membros superiores direito e esquerdo.',
        'Comparação entre os membros inferiores direito e esquerdo.',
        'Identificação e quantificação de possíveis assimetrias e déficits de força muscular.',
        'Análise da distribuição dos déficits, quando presentes, considerando comprometimentos proximais, distais ou assimétricos.',
        'Interpretação em relação a parâmetros de referência apropriados à idade, sexo e metodologia utilizada, quando disponíveis.',
        'Descrição de fatores que possam interferir nos resultados, incluindo dor, fadiga, limitações articulares e dificuldade de execução.',
        'Correlação clínica e análise das possíveis repercussões funcionais sobre atividades manuais, marcha, equilíbrio e mobilidade.',
        'Conclusão médica fundamentada, com identificação profissional, número do CRM, especialidade e assinatura do médico responsável.',
      ]],

      ['k' => 'h', 't' => '7. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação objetiva da força muscular global e segmentar, caracterização de possíveis déficits motores e documentação funcional, justifico e solicito a realização de DINAMOMETRIA MUSCULAR DOS QUATRO MEMBROS (SUPERIORES E INFERIORES) BILATERAL, acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a emissão do laudo por médico especialista em NEUROLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, neuromuscular, funcional e médico-pericial da avaliação.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de mensuração dinamométrica e o laudo médico interpretativo possuem finalidades distintas.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada é solicitada para proporcionar adequada correlação clínico-funcional, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
      ['k' => 'p', 't' => 'A presente solicitação tem por objetivo assegurar avaliação quantitativa, padronizada e tecnicamente fundamentada da força muscular dos quatro membros, com especial atenção às repercussões neurológicas, musculoesqueléticas e funcionais sobre a capacidade motora global do paciente.'],
    ],
  ],

  'est-01' => [
    'examTitle' => 'ESTESIOMETRIA DE MEMBROS SUPERIORES BILATERAL',
    'finalidade' => 'Avaliação Neurológica, Sensitiva, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exame solicitado',
    'examSolicitado' => 'Estesiometria de membros superiores direito e esquerdo, com avaliação sensitiva cutânea, investigação de possíveis alterações da sensibilidade superficial, análise comparativa bilateral e emissão de laudo médico interpretativo especializado.',
    'specialtyPref' => 'Especialidades médicas preferenciais para realização da avaliação clínica e emissão do laudo: Neurologia, Ortopedia e Traumatologia ou Medicina Física e Reabilitação (Fisiatria).',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de ESTESIOMETRIA DE MEMBROS SUPERIORES BILATERAL, utilizando instrumento apropriado e metodologia padronizada, preferencialmente monofilamentos de Semmes-Weinstein, para investigação de possíveis alterações da sensibilidade cutânea e caracterização funcional da percepção de estímulos mecânicos.'],
      ['k' => 'p', 't' => 'A estesiometria constitui método complementar de avaliação sensitiva, permitindo estimar limiares de percepção ao estímulo tátil e identificar alterações compatíveis com comprometimento da sensibilidade superficial.'],
      ['k' => 'p', 't' => 'O exame poderá contribuir para a investigação e o acompanhamento de condições clínicas como:'],
      ['k' => 'ol', 'items' => [
        'Neuropatias periféricas sensitivas.',
        'Polineuropatias inflamatórias e desmielinizantes.',
        'Neuropatias metabólicas e tóxicas.',
        'Radiculopatias cervicais com manifestações sensitivas.',
        'Síndromes compressivas de nervos periféricos, incluindo síndrome do túnel do carpo.',
        'Lesões traumáticas de nervos periféricos.',
        'Alterações sensitivas decorrentes de doenças do sistema nervoso central.',
        'Sequelas neurológicas de acidentes vasculares cerebrais.',
        'Distúrbios sensitivos associados a doenças musculoesqueléticas.',
        'Alterações da sensibilidade com repercussões sobre a funcionalidade manual.',
      ]],
      ['k' => 'p', 't' => 'A realização do exame justifica-se pela necessidade de documentar a distribuição e a intensidade das alterações da sensibilidade tátil, permitindo correlação com a semiologia neurológica, exame físico e exames complementares, quando disponíveis.'],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA NEUROLÓGICA E SENSITIVA'],
      ['k' => 'p', 't' => 'A avaliação estesiométrica dos membros superiores apresenta relevância na investigação de possíveis alterações das vias sensitivas periféricas e centrais.'],
      ['k' => 'p', 't' => 'Solicito avaliação bilateral, contemplando:'],
      ['k' => 'ol', 'items' => [
        'Sensibilidade tátil superficial: determinação do limiar de percepção ao estímulo mecânico aplicado à pele.',
        'Distribuição anatômica: avaliação de regiões cutâneas correspondentes aos territórios dos nervos mediano, ulnar e radial.',
        'Distribuição dermatomérica: análise de regiões relacionadas aos dermátomos cervicais e torácico superior, conforme indicação clínica.',
        'Comparação bilateral: identificação de possíveis assimetrias sensitivas entre os membros superiores.',
        'Investigação de hipoestesia: redução da percepção sensitiva em regiões examinadas.',
        'Investigação de anestesia tátil: ausência de percepção dos estímulos testados, respeitando os limites do instrumento.',
        'Análise de alterações de limiar: identificação de respostas diferentes dos parâmetros esperados para o método utilizado.',
        'Correlação funcional: investigação das possíveis repercussões sensitivas sobre preensão, manipulação de objetos e atividades manuais.',
      ]],
      ['k' => 'p', 't' => 'A estesiometria com monofilamentos avalia predominantemente a percepção tátil à pressão. A caracterização de hiperalgesia, alodinia, sensibilidade térmica, vibratória ou proprioceptiva poderá exigir outros testes específicos.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA PARA REALIZAÇÃO E LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que a estesiometria seja integrada a uma avaliação clínica médica e acompanhada de LAUDO MÉDICO INTERPRETATIVO ESPECIALIZADO, preferencialmente elaborado e assinado por médico de uma das seguintes especialidades:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para interpretação dos resultados em correlação com a semiologia neurológica, investigação de neuropatias periféricas, polineuropatias, radiculopatias cervicais, lesões de nervos periféricos e comprometimentos sensitivos de origem central.'],
      ['k' => 'p', 't' => 'A avaliação neurológica poderá considerar:'],
      ['k' => 'ul', 'items' => [
        'Distribuição topográfica das alterações sensitivas.',
        'Correspondência com territórios de inervação periférica.',
        'Correlação com dermátomos cervicais.',
        'Presença de parestesias, disestesias, hipoestesias e outras manifestações sensitivas.',
        'Associação com déficits motores, alterações dos reflexos osteotendíneos e comprometimentos funcionais.',
        'Necessidade de investigação complementar, incluindo eletroneuromiografia, quando clinicamente indicada.',
      ]],
      ['k' => 'sh', 't' => 'II – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos achados sensitivos com lesões traumáticas, síndromes compressivas, alterações osteoarticulares, doenças da coluna cervical e comprometimentos musculoesqueléticos associados a manifestações neurológicas.'],
      ['k' => 'sh', 't' => 'III – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para interpretação das alterações sensitivas no contexto da capacidade funcional, independência nas atividades de vida diária, destreza manual, desempenho ocupacional e necessidades de reabilitação.'],
      ['k' => 'p', 't' => 'A necessidade de laudo médico especializado fundamenta-se na importância de integrar os achados estesiométricos à história clínica, ao exame neurológico e aos demais exames complementares.'],
      ['k' => 'p', 't' => 'A identificação de alterações sensitivas por meio de estesiometria, isoladamente, não permite estabelecer com segurança a etiologia, localização anatômica precisa ou gravidade global de uma doença neurológica.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA DA PARTICIPAÇÃO MÉDICA NA AVALIAÇÃO'],
      ['k' => 'p', 't' => 'Considerando a finalidade neurológica e médico-pericial desta solicitação, recomenda-se que a interpretação diagnóstica seja realizada por médico habilitado, preferencialmente especialista nas áreas anteriormente mencionadas.'],
      ['k' => 'p', 't' => 'A participação médica é especialmente relevante para:'],
      ['k' => 'ol', 'items' => [
        'Realizar a correlação entre os achados sensitivos e a história clínica.',
        'Identificar padrões de distribuição compatíveis com neuropatias periféricas, radiculopatias ou lesões centrais.',
        'Diferenciar alterações sensitivas de possíveis fatores locais, dermatológicos ou musculoesqueléticos.',
        'Integrar os resultados com a avaliação da força muscular, reflexos e demais modalidades sensitivas.',
        'Determinar a necessidade de exames complementares e investigação etiológica.',
        'Avaliar as possíveis repercussões clínicas e funcionais das alterações identificadas.',
        'Elaborar conclusão diagnóstica médica fundamentada, respeitando os limites do método.',
      ]],
      ['k' => 'p', 't' => 'Ressalta-se que a realização técnica da estesiometria não é atividade exclusiva do médico. Profissionais de saúde legalmente habilitados, como fisioterapeutas e terapeutas ocupacionais, também podem executar avaliações sensitivas dentro de suas competências.'],
      ['k' => 'p', 't' => 'Entretanto, para a finalidade específica desta solicitação, requer-se laudo médico interpretativo especializado, sem prejuízo da participação de outros profissionais habilitados na execução técnica do procedimento.'],

      ['k' => 'h', 't' => '5. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'A presente solicitação possui também finalidade médico-pericial, visando à obtenção de informações objetivamente documentadas e obtidas por metodologia padronizada sobre a sensibilidade cutânea dos membros superiores.'],
      ['k' => 'p', 't' => 'A avaliação poderá contribuir para:'],
      ['k' => 'ol', 'items' => [
        'Identificação e documentação de alterações da sensibilidade tátil.',
        'Caracterização da distribuição topográfica de déficits sensitivos.',
        'Comparação entre os membros superiores direito e esquerdo.',
        'Investigação de possíveis repercussões funcionais relacionadas à perda de sensibilidade.',
        'Acompanhamento evolutivo de doenças neurológicas e neuropatias periféricas.',
        'Documentação de achados sensitivos relevantes para avaliações médico-periciais.',
        'Correlação entre manifestações clínicas, resultados instrumentais e exames complementares.',
        'Subsídio à análise da capacidade funcional e laborativa, considerando as exigências específicas da atividade profissional.',
      ]],
      ['k' => 'p', 't' => 'A estesiometria depende da resposta perceptiva do paciente e deve ser interpretada considerando colaboração, compreensão das instruções, técnica de aplicação e reprodutibilidade dos achados.'],
      ['k' => 'p', 't' => 'Ressalta-se que a estesiometria, isoladamente, não comprova incapacidade laborativa, incapacidade permanente ou grau de deficiência, sendo necessária avaliação clínica e médico-pericial abrangente.'],

      ['k' => 'h', 't' => '6. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação do instrumento utilizado, metodologia e protocolo técnico.',
        'Descrição dos monofilamentos empregados, quando aplicável, com seus respectivos valores de força.',
        'Registro das regiões anatômicas examinadas nos membros superiores.',
        'Mapeamento dos territórios sensitivos avaliados, incluindo nervos periféricos e dermátomos, quando clinicamente indicado.',
        'Registro dos limiares de percepção tátil encontrados em cada região.',
        'Comparação bilateral entre os membros superiores direito e esquerdo.',
        'Identificação de possíveis áreas de hipoestesia ou ausência de percepção tátil aos estímulos testados.',
        'Descrição da consistência e reprodutibilidade das respostas, quando avaliadas.',
        'Correlação dos achados com a semiologia neurológica e possíveis repercussões funcionais.',
        'Interpretação clínica fundamentada, incluindo limitações do método.',
        'Conclusão médica especializada, sem extrapolação diagnóstica dos achados instrumentais.',
        'Identificação profissional, número do CRM, especialidade e assinatura do médico responsável pelo laudo.',
      ]],

      ['k' => 'h', 't' => '7. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação de possíveis alterações da sensibilidade superficial, caracterização topográfica de déficits sensitivos e documentação funcional, JUSTIFICO E SOLICITO A REALIZAÇÃO DE ESTESIOMETRIA DE MEMBROS SUPERIORES BILATERAL, acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a avaliação clínica e a emissão do laudo por médico especialista em NEUROLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, sensitiva, funcional e médico-pericial do procedimento.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de mensuração estesiométrica e o laudo médico interpretativo possuem finalidades distintas.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada é solicitada para assegurar adequada correlação clínico-neurológica, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
      ['k' => 'p', 't' => 'A presente solicitação tem por objetivo assegurar avaliação padronizada e tecnicamente fundamentada da sensibilidade cutânea dos membros superiores, com especial atenção às possíveis alterações neurológicas, à distribuição dos déficits sensitivos e às repercussões sobre a capacidade funcional do paciente.'],
    ],
  ],

  'est-02' => [
    'examTitle' => 'ESTESIOMETRIA DE MEMBROS INFERIORES BILATERAL',
    'finalidade' => 'Avaliação Neurológica, Sensitiva, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exame solicitado',
    'examSolicitado' => 'Estesiometria de membros inferiores direito e esquerdo, com avaliação sensitiva cutânea, investigação de possíveis alterações da sensibilidade superficial, análise comparativa bilateral e emissão de laudo médico interpretativo especializado.',
    'specialtyPref' => 'Especialidades médicas preferenciais para realização da avaliação clínica e emissão do laudo: Neurologia, Ortopedia e Traumatologia ou Medicina Física e Reabilitação (Fisiatria).',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de ESTESIOMETRIA DE MEMBROS INFERIORES BILATERAL, utilizando instrumento apropriado e metodologia padronizada, preferencialmente monofilamentos de Semmes-Weinstein, para investigação de possíveis alterações da sensibilidade cutânea e caracterização funcional da percepção de estímulos mecânicos nos membros inferiores.'],
      ['k' => 'p', 't' => 'A estesiometria constitui método complementar de avaliação sensitiva, permitindo estimar limiares de percepção ao estímulo tátil e identificar alterações compatíveis com comprometimento da sensibilidade superficial, sendo particularmente relevante na avaliação plantar e na investigação do risco de lesões cutâneas associadas à perda de sensibilidade protetora.'],
      ['k' => 'p', 't' => 'O exame poderá contribuir para a investigação e o acompanhamento de condições clínicas como:'],
      ['k' => 'ol', 'items' => [
        'Polineuropatias periféricas sensitivas, incluindo neuropatia diabética.',
        'Polineuropatias inflamatórias e desmielinizantes.',
        'Neuropatias metabólicas e tóxicas.',
        'Radiculopatias lombossacras com manifestações sensitivas.',
        'Síndromes compressivas de nervos periféricos, incluindo síndrome do túnel do tarso.',
        'Lesões traumáticas de nervos periféricos.',
        'Alterações sensitivas relacionadas a lesões medulares.',
        'Sequelas neurológicas de acidentes vasculares cerebrais.',
        'Distúrbios sensitivos associados a doenças musculoesqueléticas.',
        'Alterações da sensibilidade com repercussões sobre a marcha, o equilíbrio e a integridade cutânea dos pés.',
      ]],
      ['k' => 'p', 't' => 'A realização do exame justifica-se pela necessidade de documentar a distribuição e a intensidade das alterações da sensibilidade tátil, permitindo correlação com a semiologia neurológica, exame físico e exames complementares, quando disponíveis.'],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA NEUROLÓGICA E SENSITIVA'],
      ['k' => 'p', 't' => 'A avaliação estesiométrica dos membros inferiores apresenta relevância na investigação de possíveis alterações das vias sensitivas periféricas e centrais.'],
      ['k' => 'p', 't' => 'Solicito avaliação bilateral, contemplando:'],
      ['k' => 'ol', 'items' => [
        'Sensibilidade tátil superficial: determinação do limiar de percepção ao estímulo mecânico aplicado à pele.',
        'Sensibilidade plantar: avaliação de pontos padronizados nas regiões plantares, incluindo hálux e cabeças metatarsais.',
        'Distribuição anatômica: avaliação de regiões cutâneas correspondentes aos territórios dos nervos fibular superficial, fibular profundo, tibial, sural e safeno.',
        'Distribuição dermatomérica: análise de regiões relacionadas aos dermátomos lombares e sacrais, especialmente L2, L3, L4, L5 e S1, conforme indicação clínica.',
        'Comparação bilateral: identificação de possíveis assimetrias sensitivas entre os membros inferiores.',
        'Investigação de hipoestesia: redução da percepção sensitiva em regiões examinadas.',
        'Investigação de anestesia tátil: ausência de percepção dos estímulos testados, respeitando os limites do instrumento.',
        'Correlação funcional: investigação das possíveis repercussões sensitivas sobre a marcha, o equilíbrio, a mobilidade e a integridade cutânea dos pés.',
      ]],
      ['k' => 'p', 't' => 'A estesiometria com monofilamentos avalia predominantemente a percepção tátil à pressão. A caracterização de hiperalgesia, alodinia, sensibilidade térmica, vibratória ou proprioceptiva poderá exigir outros testes específicos.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA PARA REALIZAÇÃO E LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que a estesiometria seja integrada a uma avaliação clínica médica e acompanhada de LAUDO MÉDICO INTERPRETATIVO ESPECIALIZADO, preferencialmente elaborado e assinado por médico de uma das seguintes especialidades:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para interpretação dos resultados em correlação com a semiologia neurológica, investigação de neuropatias periféricas, polineuropatias, radiculopatias lombossacras, lesões de nervos periféricos e comprometimentos sensitivos de origem central.'],
      ['k' => 'p', 't' => 'A avaliação neurológica poderá considerar:'],
      ['k' => 'ul', 'items' => [
        'Distribuição topográfica das alterações sensitivas.',
        'Correspondência com territórios de inervação periférica.',
        'Correlação com dermátomos lombares e sacrais.',
        'Presença de parestesias, disestesias, hipoestesias e outras manifestações sensitivas.',
        'Associação com déficits motores, alterações dos reflexos osteotendíneos e comprometimentos funcionais.',
        'Necessidade de investigação complementar, incluindo eletroneuromiografia, quando clinicamente indicada.',
      ]],
      ['k' => 'sh', 't' => 'II – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos achados sensitivos com lesões traumáticas, síndromes compressivas, alterações osteoarticulares, doenças degenerativas da coluna lombossacra e comprometimentos musculoesqueléticos associados a manifestações neurológicas.'],
      ['k' => 'sh', 't' => 'III – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para interpretação das alterações sensitivas no contexto da capacidade funcional, marcha, equilíbrio, mobilidade, independência nas atividades de vida diária e necessidades de reabilitação.'],
      ['k' => 'p', 't' => 'A necessidade de laudo médico especializado fundamenta-se na importância de integrar os achados estesiométricos à história clínica, ao exame neurológico e aos demais exames complementares.'],
      ['k' => 'p', 't' => 'A identificação de alterações sensitivas por meio de estesiometria, isoladamente, não permite estabelecer com segurança a etiologia, localização anatômica precisa ou gravidade global de uma doença neurológica.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA DA PARTICIPAÇÃO MÉDICA NA AVALIAÇÃO'],
      ['k' => 'p', 't' => 'Considerando a finalidade neurológica e médico-pericial desta solicitação, recomenda-se que a interpretação diagnóstica seja realizada por médico habilitado, preferencialmente especialista nas áreas anteriormente mencionadas.'],
      ['k' => 'p', 't' => 'A participação médica é especialmente relevante para:'],
      ['k' => 'ol', 'items' => [
        'Realizar a correlação entre os achados sensitivos e a história clínica.',
        'Identificar padrões de distribuição compatíveis com polineuropatias, radiculopatias lombossacras ou lesões centrais.',
        'Diferenciar alterações sensitivas de possíveis fatores locais, dermatológicos, vasculares ou musculoesqueléticos.',
        'Integrar os resultados com a avaliação da força muscular, reflexos e demais modalidades sensitivas.',
        'Determinar a necessidade de exames complementares e investigação etiológica.',
        'Avaliar as possíveis repercussões clínicas e funcionais das alterações identificadas, incluindo o risco de lesões cutâneas nos pés.',
        'Elaborar conclusão diagnóstica médica fundamentada, respeitando os limites do método.',
      ]],
      ['k' => 'p', 't' => 'Ressalta-se que a realização técnica da estesiometria não é atividade exclusiva do médico. Profissionais de saúde legalmente habilitados, como fisioterapeutas e terapeutas ocupacionais, também podem executar avaliações sensitivas dentro de suas competências.'],
      ['k' => 'p', 't' => 'Entretanto, para a finalidade específica desta solicitação, requer-se laudo médico interpretativo especializado, sem prejuízo da participação de outros profissionais habilitados na execução técnica do procedimento.'],

      ['k' => 'h', 't' => '5. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'A presente solicitação possui também finalidade médico-pericial, visando à obtenção de informações objetivamente documentadas e obtidas por metodologia padronizada sobre a sensibilidade cutânea dos membros inferiores.'],
      ['k' => 'p', 't' => 'A avaliação poderá contribuir para:'],
      ['k' => 'ol', 'items' => [
        'Identificação e documentação de alterações da sensibilidade tátil.',
        'Caracterização da distribuição topográfica de déficits sensitivos.',
        'Comparação entre os membros inferiores direito e esquerdo.',
        'Investigação de possíveis repercussões funcionais relacionadas à perda de sensibilidade, incluindo sobre a marcha e o equilíbrio.',
        'Acompanhamento evolutivo de doenças neurológicas e neuropatias periféricas.',
        'Documentação de achados sensitivos relevantes para avaliações médico-periciais.',
        'Correlação entre manifestações clínicas, resultados instrumentais e exames complementares.',
        'Subsídio à análise da capacidade funcional e laborativa, considerando as exigências específicas da atividade profissional.',
      ]],
      ['k' => 'p', 't' => 'A estesiometria depende da resposta perceptiva do paciente e deve ser interpretada considerando colaboração, compreensão das instruções, técnica de aplicação e reprodutibilidade dos achados.'],
      ['k' => 'p', 't' => 'Ressalta-se que a estesiometria, isoladamente, não comprova incapacidade laborativa, incapacidade permanente ou grau de deficiência, sendo necessária avaliação clínica e médico-pericial abrangente.'],

      ['k' => 'h', 't' => '6. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação do instrumento utilizado, metodologia e protocolo técnico.',
        'Descrição dos monofilamentos empregados, quando aplicável, com seus respectivos valores de força.',
        'Registro das regiões anatômicas examinadas nos membros inferiores, incluindo regiões plantares.',
        'Mapeamento dos territórios sensitivos avaliados, incluindo nervos periféricos e dermátomos, quando clinicamente indicado.',
        'Registro dos limiares de percepção tátil encontrados em cada região.',
        'Comparação bilateral entre os membros inferiores direito e esquerdo.',
        'Identificação de possíveis áreas de hipoestesia ou ausência de percepção tátil aos estímulos testados.',
        'Descrição da consistência e reprodutibilidade das respostas, quando avaliadas.',
        'Correlação dos achados com a semiologia neurológica e possíveis repercussões funcionais sobre a marcha e o equilíbrio.',
        'Interpretação clínica fundamentada, incluindo limitações do método.',
        'Conclusão médica especializada, sem extrapolação diagnóstica dos achados instrumentais.',
        'Identificação profissional, número do CRM, especialidade e assinatura do médico responsável pelo laudo.',
      ]],

      ['k' => 'h', 't' => '7. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação de possíveis alterações da sensibilidade superficial, caracterização topográfica de déficits sensitivos e documentação funcional, JUSTIFICO E SOLICITO A REALIZAÇÃO DE ESTESIOMETRIA DE MEMBROS INFERIORES BILATERAL, acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a avaliação clínica e a emissão do laudo por médico especialista em NEUROLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, sensitiva, funcional e médico-pericial do procedimento.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de mensuração estesiométrica e o laudo médico interpretativo possuem finalidades distintas.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada é solicitada para assegurar adequada correlação clínico-neurológica, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
      ['k' => 'p', 't' => 'A presente solicitação tem por objetivo assegurar avaliação padronizada e tecnicamente fundamentada da sensibilidade cutânea dos membros inferiores, com especial atenção às possíveis alterações neurológicas, à distribuição dos déficits sensitivos e às repercussões sobre a marcha, o equilíbrio e a capacidade funcional do paciente.'],
    ],
  ],

  'est-03' => [
    'examTitle' => 'ESTESIOMETRIA DOS QUATRO MEMBROS (SUPERIORES E INFERIORES) BILATERAL',
    'finalidade' => 'Avaliação Neurológica, Sensitiva, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exame solicitado',
    'examSolicitado' => 'Estesiometria dos quatro membros, compreendendo membros superiores direito e esquerdo e membros inferiores direito e esquerdo, com avaliação dos limiares de percepção tátil, mapeamento topográfico das regiões examinadas, análise comparativa bilateral e emissão de laudo médico interpretativo especializado.',
    'specialtyPref' => 'Especialidades médicas preferenciais para avaliação clínica e emissão do laudo: Neurologia, Ortopedia e Traumatologia ou Medicina Física e Reabilitação (Fisiatria).',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de ESTESIOMETRIA DOS QUATRO MEMBROS, mediante utilização de instrumento apropriado, preferencialmente monofilamentos de Semmes-Weinstein, com metodologia padronizada e registro sistemático dos limiares de percepção tátil nas regiões anatômicas examinadas.'],
      ['k' => 'p', 't' => 'A estesiometria constitui método complementar de avaliação neurossensitiva, permitindo identificar e documentar alterações da percepção tátil cutânea, especialmente redução dos limiares perceptivos ou ausência de percepção aos estímulos aplicados, respeitando as características e limitações do instrumento.'],
      ['k' => 'p', 't' => 'A avaliação simultânea dos quatro membros poderá contribuir para identificar padrões de distribuição sensitiva, incluindo alterações distais, proximais, simétricas ou assimétricas, que possam orientar a investigação clínica de comprometimentos neurológicos periféricos ou centrais.'],
      ['k' => 'p', 't' => 'O exame poderá contribuir para a investigação e o acompanhamento de condições como:'],
      ['k' => 'ol', 'items' => [
        'Polineuropatias periféricas sensitivas e sensitivo-motoras.',
        'Polineuropatias inflamatórias e desmielinizantes.',
        'Neuropatias metabólicas, tóxicas e carenciais.',
        'Radiculopatias cervicais e lombossacras com manifestações sensitivas.',
        'Mononeuropatias e síndromes compressivas de nervos periféricos.',
        'Lesões traumáticas de nervos periféricos.',
        'Alterações sensitivas relacionadas a lesões medulares.',
        'Sequelas neurológicas de acidentes vasculares cerebrais.',
        'Doenças do sistema nervoso central com manifestações sensitivas.',
        'Alterações da sensibilidade associadas a doenças musculoesqueléticas e outras condições clínicas.',
      ]],
      ['k' => 'p', 't' => 'A realização do exame justifica-se pela necessidade de documentar a distribuição anatômica e os limiares de percepção tátil, permitindo correlação com a semiologia neurológica, exame físico e exames complementares, quando disponíveis.'],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA NEUROLÓGICA E SENSITIVA DOS MEMBROS SUPERIORES'],
      ['k' => 'p', 't' => 'Solicito avaliação estesiométrica bilateral dos membros superiores, contemplando, conforme indicação clínica e protocolo utilizado:'],
      ['k' => 'ol', 'items' => [
        'Sensibilidade tátil superficial: determinação dos limiares de percepção aos estímulos mecânicos aplicados à superfície cutânea.',
        'Territórios dos nervos periféricos: avaliação de regiões correspondentes aos nervos mediano, ulnar e radial.',
        'Distribuição dermatomérica: análise de regiões cutâneas relacionadas aos dermátomos cervicais e torácico superior.',
        'Sensibilidade palmar e digital: avaliação de pontos específicos das mãos e dedos.',
        'Comparação bilateral: identificação de possíveis assimetrias sensitivas entre os membros superiores.',
        'Investigação de hipoestesia: identificação de regiões com redução da percepção tátil.',
        'Investigação de ausência de percepção: registro de áreas sem resposta aos estímulos aplicados, respeitando os limites do método.',
        'Correlação funcional: investigação de possíveis repercussões sobre destreza manual, manipulação de objetos e atividades habituais.',
      ]],
      ['k' => 'p', 't' => 'A análise deverá considerar as características clínicas do paciente, a técnica utilizada e a consistência das respostas.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA NEUROLÓGICA E SENSITIVA DOS MEMBROS INFERIORES'],
      ['k' => 'p', 't' => 'Solicito avaliação estesiométrica bilateral dos membros inferiores, contemplando, conforme indicação clínica e protocolo utilizado:'],
      ['k' => 'ol', 'items' => [
        'Sensibilidade tátil superficial: determinação dos limiares de percepção aos estímulos mecânicos.',
        'Sensibilidade plantar: avaliação de pontos padronizados nas regiões plantares, incluindo hálux e cabeças metatarsais, conforme o protocolo adotado.',
        'Territórios dos nervos periféricos: avaliação de regiões correspondentes aos nervos fibular superficial, fibular profundo, tibial, sural e safeno.',
        'Distribuição dermatomérica: análise de regiões relacionadas aos dermátomos lombares e sacrais, especialmente L2, L3, L4, L5 e S1, quando clinicamente indicada.',
        'Comparação bilateral: identificação de possíveis assimetrias sensitivas entre os membros inferiores.',
        'Investigação de hipoestesia: identificação de áreas com redução da percepção tátil.',
        'Investigação de ausência de percepção: registro de regiões sem resposta aos estímulos testados.',
        'Correlação funcional: investigação das possíveis repercussões dos déficits sensitivos sobre a segurança da marcha, mobilidade e integridade cutânea dos pés.',
      ]],
      ['k' => 'p', 't' => 'A estesiometria com monofilamentos avalia predominantemente a percepção tátil à pressão. A investigação de sensibilidade vibratória, proprioceptiva, térmica e dolorosa exige métodos complementares específicos.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA PARA REALIZAÇÃO E LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que a estesiometria dos quatro membros seja integrada a uma avaliação clínica médica e acompanhada de LAUDO MÉDICO INTERPRETATIVO ESPECIALIZADO, preferencialmente elaborado e assinado por médico de uma das seguintes especialidades:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para interpretação dos resultados em correlação com a semiologia neurológica, investigação de neuropatias periféricas, polineuropatias, radiculopatias cervicais e lombossacras, lesões de nervos periféricos e comprometimentos sensitivos de origem central.'],
      ['k' => 'p', 't' => 'A avaliação neurológica deverá considerar, quando disponíveis:'],
      ['k' => 'ul', 'items' => [
        'Distribuição topográfica das alterações sensitivas.',
        'Correspondência com territórios de inervação periférica.',
        'Correlação com dermátomos cervicais, lombares e sacrais.',
        'Presença de parestesias, disestesias, hipoestesias e outras manifestações sensitivas.',
        'Associação com déficits motores, alterações dos reflexos osteotendíneos e comprometimentos funcionais.',
        'Necessidade de investigação complementar, incluindo eletroneuromiografia, quando clinicamente indicada.',
      ]],
      ['k' => 'sh', 't' => 'II – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos achados sensitivos com lesões traumáticas, síndromes compressivas, doenças degenerativas da coluna vertebral, comprometimentos osteoarticulares e alterações musculoesqueléticas associadas a manifestações neurológicas.'],
      ['k' => 'sh', 't' => 'III – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para interpretação das alterações sensitivas no contexto da capacidade funcional global, destreza manual, marcha, equilíbrio, mobilidade, independência nas atividades de vida diária, desempenho ocupacional e necessidades de reabilitação.'],
      ['k' => 'p', 't' => 'A necessidade de laudo médico especializado fundamenta-se na importância de integrar os achados estesiométricos à história clínica, ao exame neurológico e aos demais exames complementares.'],
      ['k' => 'p', 't' => 'A identificação de alterações sensitivas pela estesiometria, isoladamente, não permite estabelecer com segurança a etiologia, a localização anatômica precisa ou a gravidade global de uma doença neurológica.'],

      ['k' => 'h', 't' => '5. JUSTIFICATIVA DA PARTICIPAÇÃO MÉDICA NA AVALIAÇÃO'],
      ['k' => 'p', 't' => 'Considerando a finalidade neurológica e médico-pericial desta solicitação, recomenda-se que a interpretação diagnóstica seja realizada por médico habilitado, preferencialmente especialista nas áreas anteriormente mencionadas.'],
      ['k' => 'p', 't' => 'A participação médica é especialmente relevante para:'],
      ['k' => 'ol', 'items' => [
        'Realizar a correlação entre os achados sensitivos e a história clínica.',
        'Identificar padrões de distribuição compatíveis com polineuropatias, mononeuropatias, radiculopatias ou lesões centrais.',
        'Diferenciar alterações sensitivas de possíveis fatores locais, dermatológicos, vasculares ou musculoesqueléticos.',
        'Integrar os resultados com a avaliação da força muscular, reflexos osteotendíneos, coordenação motora e demais modalidades sensitivas.',
        'Determinar a necessidade de exames complementares e investigação etiológica.',
        'Avaliar as possíveis repercussões clínicas e funcionais das alterações identificadas.',
        'Elaborar conclusão diagnóstica médica fundamentada, respeitando os limites do método.',
      ]],
      ['k' => 'p', 't' => 'Ressalta-se que a realização técnica da estesiometria não é atividade exclusiva do médico. Outros profissionais de saúde legalmente habilitados podem executar avaliações sensitivas dentro de suas competências profissionais.'],
      ['k' => 'p', 't' => 'Entretanto, para a finalidade específica desta solicitação, requer-se laudo médico interpretativo especializado, sem prejuízo da participação de outros profissionais habilitados na execução técnica do procedimento.'],

      ['k' => 'h', 't' => '6. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'A presente solicitação possui também finalidade médico-pericial, visando à obtenção de informações documentadas por metodologia padronizada sobre a sensibilidade cutânea dos quatro membros.'],
      ['k' => 'p', 't' => 'A avaliação poderá contribuir para:'],
      ['k' => 'ol', 'items' => [
        'Identificação e documentação de alterações da sensibilidade tátil.',
        'Caracterização da distribuição topográfica de possíveis déficits sensitivos.',
        'Comparação bilateral dos membros superiores e inferiores.',
        'Investigação de padrões sensitivos distais, proximais, simétricos ou assimétricos.',
        'Avaliação das possíveis repercussões funcionais sobre atividades manuais e capacidade de locomoção.',
        'Acompanhamento evolutivo de doenças neurológicas e neuropatias periféricas.',
        'Documentação de achados sensitivos relevantes para avaliações médico-periciais.',
        'Correlação entre manifestações clínicas, resultados instrumentais e exames complementares.',
        'Subsídio à análise da capacidade funcional e laborativa, considerando as exigências específicas da atividade profissional.',
      ]],
      ['k' => 'p', 't' => 'A estesiometria depende da percepção e da resposta do paciente aos estímulos aplicados, devendo ser interpretada considerando colaboração, compreensão das instruções, técnica de aplicação e reprodutibilidade dos achados.'],
      ['k' => 'p', 't' => 'Ressalta-se que a estesiometria, isoladamente, não comprova incapacidade laborativa, incapacidade permanente ou grau de deficiência, sendo necessária avaliação clínica e médico-pericial abrangente.'],

      ['k' => 'h', 't' => '7. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação do instrumento utilizado, metodologia e protocolo técnico.',
        'Descrição dos monofilamentos empregados, quando aplicável, com seus respectivos valores de força.',
        'Registro das regiões anatômicas examinadas nos quatro membros.',
        'Mapeamento dos territórios sensitivos avaliados, incluindo nervos periféricos e dermátomos, quando clinicamente indicado.',
        'Registro dos limiares de percepção tátil encontrados em cada região.',
        'Comparação bilateral dos membros superiores e inferiores.',
        'Identificação de possíveis áreas de hipoestesia ou ausência de percepção tátil aos estímulos testados.',
        'Descrição da consistência e reprodutibilidade das respostas, quando avaliadas.',
        'Correlação clínica e análise das possíveis repercussões funcionais sobre atividades manuais, marcha, equilíbrio e mobilidade.',
        'Interpretação clínica fundamentada, incluindo limitações do método.',
        'Conclusão médica especializada, sem extrapolação diagnóstica dos achados instrumentais.',
        'Identificação profissional, número do CRM, especialidade e assinatura do médico responsável pelo laudo.',
      ]],

      ['k' => 'h', 't' => '8. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação de possíveis alterações da sensibilidade superficial, caracterização topográfica de déficits sensitivos e documentação funcional, JUSTIFICO E SOLICITO A REALIZAÇÃO DE ESTESIOMETRIA DOS QUATRO MEMBROS (SUPERIORES E INFERIORES) BILATERAL, acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a avaliação clínica e a emissão do laudo por médico especialista em NEUROLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, sensitiva, funcional e médico-pericial do procedimento.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de mensuração estesiométrica e o laudo médico interpretativo possuem finalidades distintas.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada é solicitada para assegurar adequada correlação clínico-neurológica, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
      ['k' => 'p', 't' => 'A presente solicitação tem por objetivo assegurar avaliação padronizada e tecnicamente fundamentada da sensibilidade cutânea dos quatro membros, com especial atenção às possíveis alterações neurológicas, à distribuição dos déficits sensitivos e às repercussões sobre a capacidade funcional global do paciente.'],
    ],
  ],

  'equ-01' => [
    'examTitle' => 'AVALIAÇÃO CLÍNICA DO EQUILÍBRIO E RISCO DE QUEDAS',
    'examTitle2' => 'TESTE TIMED UP AND GO (TUG) E ESCALA DE EQUILÍBRIO DE BERG (BBS)',
    'finalidade' => 'Avaliação Neurológica, Vestibular, Postural, Funcional e Médico-Pericial',
    'examSolicitadoLabel' => 'Exames solicitados',
    'examSolicitadoList' => [
      'Teste Timed Up and Go (TUG).',
      'Escala de Equilíbrio de Berg (Berg Balance Scale – BBS).',
    ],
    'solicitacaoComplementar' => 'Emissão de laudo médico interpretativo especializado, preferencialmente por médico neurologista, otorrinolaringologista, ortopedista e traumatologista ou especialista em Medicina Física e Reabilitação (Fisiatria).',
    'body' => [
      ['k' => 'h', 't' => '1. RELATÓRIO MÉDICO E FUNDAMENTAÇÃO CLÍNICA'],
      ['k' => 'p', 't' => 'Solicito a realização de AVALIAÇÃO CLÍNICA DO EQUILÍBRIO E RISCO DE QUEDAS, POR MEIO DO TESTE TIMED UP AND GO (TUG) E DA ESCALA DE EQUILÍBRIO DE BERG (BBS), com a finalidade de investigar possíveis alterações do controle postural, estabilidade corporal, coordenação motora, mobilidade funcional e desempenho da marcha.'],
      ['k' => 'p', 't' => 'A avaliação do equilíbrio constitui instrumento complementar relevante na investigação de comprometimentos dos sistemas vestibular, cerebelar, proprioceptivo, sensório-motor e musculoesquelético.'],
      ['k' => 'p', 't' => 'O equilíbrio corporal depende da adequada integração das aferências vestibulares, visuais e somatossensoriais, associada ao processamento central e às respostas motoras necessárias para a manutenção da estabilidade postural.'],
      ['k' => 'p', 't' => 'Alterações nesses mecanismos podem ocasionar instabilidade corporal, dificuldades de marcha, vertigem, tontura, alterações da coordenação, comprometimento das transferências posturais e aumento do risco de quedas.'],
      ['k' => 'p', 't' => 'A realização dos testes poderá contribuir para a investigação e o acompanhamento de condições clínicas como:'],
      ['k' => 'ol', 'items' => [
        'Síndromes vestibulares periféricas e centrais.',
        'Ataxias cerebelares e distúrbios da coordenação motora.',
        'Doença de Parkinson e outras síndromes parkinsonianas.',
        'Polineuropatias periféricas com comprometimento sensitivo ou proprioceptivo.',
        'Sequelas motoras de acidentes vasculares cerebrais.',
        'Esclerose múltipla e outras doenças desmielinizantes.',
        'Alterações da marcha decorrentes de doenças neuromusculares.',
        'Comprometimentos osteoarticulares e musculoesqueléticos.',
        'Distúrbios do controle postural e da mobilidade funcional.',
        'Condições clínicas associadas a instabilidade e risco de quedas.',
      ]],

      ['k' => 'h', 't' => '2. JUSTIFICATIVA ESPECÍFICA DO TESTE TIMED UP AND GO (TUG)'],
      ['k' => 'p', 't' => 'O Timed Up and Go (TUG) constitui instrumento padronizado de avaliação da mobilidade funcional, permitindo mensurar o tempo necessário para que o paciente se levante de uma cadeira, caminhe aproximadamente três metros, realize mudança de direção, retorne ao ponto inicial e se sente novamente.'],
      ['k' => 'p', 't' => 'Sua aplicação tem como objetivos:'],
      ['k' => 'ol', 'items' => [
        'Avaliar a mobilidade funcional global.',
        'Investigar dificuldades nas transferências posturais.',
        'Analisar o desempenho durante a marcha e as mudanças de direção.',
        'Identificar lentificação motora e limitações locomotoras.',
        'Observar instabilidade postural durante a execução da tarefa.',
        'Registrar o tempo total de execução em segundos.',
        'Auxiliar na identificação de limitações funcionais associadas ao risco de quedas.',
        'Permitir acompanhamento evolutivo e comparação entre avaliações sucessivas.',
      ]],
      ['k' => 'p', 't' => 'A interpretação deverá considerar idade, condições clínicas, uso de dispositivos auxiliares, necessidade de assistência, velocidade de marcha, limitações motoras e metodologia empregada.'],
      ['k' => 'p', 't' => 'O resultado do TUG não deverá ser interpretado isoladamente como diagnóstico de doença vestibular, neurológica ou incapacidade funcional permanente.'],

      ['k' => 'h', 't' => '3. JUSTIFICATIVA ESPECÍFICA DA ESCALA DE EQUILÍBRIO DE BERG (BBS)'],
      ['k' => 'p', 't' => 'A Escala de Equilíbrio de Berg (Berg Balance Scale – BBS) constitui instrumento clínico padronizado de avaliação do equilíbrio funcional, composto por 14 tarefas relacionadas à manutenção da postura, transferências, mudanças de posição e controle do centro de massa corporal.'],
      ['k' => 'p', 't' => 'Cada tarefa recebe pontuação de zero a quatro, totalizando pontuação máxima de 56 pontos.'],
      ['k' => 'p', 't' => 'Solicito avaliação dos seguintes componentes:'],
      ['k' => 'ol', 'items' => [
        'Passagem da posição sentada para ortostática.',
        'Permanência em pé sem apoio.',
        'Permanência sentada sem apoio dorsal.',
        'Transição da posição ortostática para sentada.',
        'Transferências entre cadeiras.',
        'Permanência em pé com olhos fechados.',
        'Permanência em pé com os pés juntos.',
        'Alcance anterior com membro superior estendido.',
        'Capacidade de recolher objeto do chão.',
        'Rotação do tronco para olhar sobre os ombros.',
        'Giro corporal de 360 graus.',
        'Apoio alternado dos pés sobre degrau.',
        'Permanência em posição tandem.',
        'Permanência em apoio unipodal.',
      ]],
      ['k' => 'p', 't' => 'A avaliação permite caracterizar o desempenho funcional do equilíbrio em diferentes condições posturais, identificando tarefas com maior dificuldade e possíveis limitações da estabilidade corporal.'],
      ['k' => 'p', 't' => 'A pontuação obtida deverá ser interpretada de acordo com as características clínicas do paciente e as limitações do instrumento, evitando conclusões diagnósticas baseadas exclusivamente no escore total.'],

      ['k' => 'h', 't' => '4. JUSTIFICATIVA PARA LAUDO MÉDICO ESPECIALIZADO'],
      ['k' => 'p', 't' => 'Solicito expressamente que os resultados do TUG e da Escala de Berg sejam acompanhados de laudo médico interpretativo especializado, preferencialmente elaborado e assinado por médico de uma das seguintes especialidades:'],
      ['k' => 'sh', 't' => 'I – NEUROLOGIA'],
      ['k' => 'p', 't' => 'Para correlação dos resultados com a semiologia neurológica, investigação de comprometimentos cerebelares, extrapiramidais, proprioceptivos, neuromusculares e alterações do sistema nervoso central ou periférico.'],
      ['k' => 'p', 't' => 'A avaliação neurológica poderá considerar força muscular, tônus, reflexos osteotendíneos, sensibilidade profunda, coordenação motora, sinais cerebelares e características da marcha.'],
      ['k' => 'sh', 't' => 'II – OTORRINOLARINGOLOGIA'],
      ['k' => 'p', 't' => 'Para investigação de síndromes vestibulares, vertigem, tontura e possíveis alterações dos mecanismos vestibulares envolvidos no controle postural, com indicação de exames otoneurológicos complementares quando necessários.'],
      ['k' => 'sh', 't' => 'III – ORTOPEDIA E TRAUMATOLOGIA'],
      ['k' => 'p', 't' => 'Para correlação das alterações do equilíbrio com comprometimentos osteoarticulares, alterações biomecânicas, limitações articulares e doenças musculoesqueléticas que possam interferir na estabilidade postural e na marcha.'],
      ['k' => 'sh', 't' => 'IV – MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA)'],
      ['k' => 'p', 't' => 'Para avaliação especializada da mobilidade funcional, desempenho postural, limitações motoras, independência nas atividades de vida diária, necessidades de reabilitação e repercussões funcionais.'],

      ['k' => 'h', 't' => '5. JUSTIFICATIVA DA PARTICIPAÇÃO MÉDICA NA AVALIAÇÃO'],
      ['k' => 'p', 't' => 'Considerando a finalidade neurológica e médico-pericial desta solicitação, requer-se interpretação diagnóstica médica especializada, com correlação dos resultados obtidos nos testes com a história clínica e o exame físico.'],
      ['k' => 'p', 't' => 'A participação médica é especialmente relevante para:'],
      ['k' => 'ol', 'items' => [
        'Investigar possíveis causas neurológicas, vestibulares e musculoesqueléticas da instabilidade.',
        'Correlacionar os resultados dos testes com a semiologia neurológica.',
        'Diferenciar limitações relacionadas à força muscular, coordenação, propriocepção, dor ou mobilidade articular.',
        'Avaliar possíveis interferências medicamentosas e condições clínicas sistêmicas.',
        'Identificar discrepâncias entre os resultados dos diferentes instrumentos.',
        'Determinar a necessidade de investigação complementar.',
        'Interpretar as repercussões funcionais das alterações identificadas.',
        'Elaborar conclusão diagnóstica fundamentada, respeitando os limites dos testes.',
      ]],
      ['k' => 'p', 't' => 'A execução dos testes TUG e Berg não constitui atividade exclusiva do médico. Profissionais de saúde legalmente habilitados, incluindo fisioterapeutas, podem realizar avaliações funcionais dentro de suas competências.'],
      ['k' => 'p', 't' => 'Entretanto, para esta solicitação, requer-se laudo médico interpretativo especializado, em razão da finalidade diagnóstica, neurológica e médico-pericial pretendida.'],

      ['k' => 'h', 't' => '6. JUSTIFICATIVA MÉDICO-PERICIAL'],
      ['k' => 'p', 't' => 'A avaliação possui também finalidade médico-pericial, visando à documentação padronizada da mobilidade funcional e do desempenho do equilíbrio estático e dinâmico.'],
      ['k' => 'p', 't' => 'Os resultados poderão contribuir para:'],
      ['k' => 'ol', 'items' => [
        'Identificação de alterações da estabilidade postural.',
        'Caracterização de dificuldades nas transferências posturais.',
        'Investigação de limitações da marcha e mobilidade.',
        'Documentação do tempo de execução do TUG.',
        'Registro da pontuação total e individual das tarefas da Escala de Berg.',
        'Identificação de fatores associados ao risco de quedas.',
        'Acompanhamento evolutivo das alterações funcionais.',
        'Subsídio à avaliação da capacidade funcional e laborativa, considerando as exigências específicas da atividade profissional.',
      ]],
      ['k' => 'p', 't' => 'Os resultados deverão ser interpretados em conjunto com a história clínica, exame neurológico, avaliação musculoesquelética e demais exames complementares.'],
      ['k' => 'p', 't' => 'Os testes TUG e Berg, isoladamente, não comprovam incapacidade laborativa, incapacidade permanente ou grau de deficiência.'],

      ['k' => 'h', 't' => '7. REQUISITOS DO RELATÓRIO E LAUDO DO EXAME'],
      ['k' => 'p', 't' => 'Solicito que o documento final contenha:'],
      ['k' => 'ol', 'items' => [
        'Identificação dos protocolos empregados.',
        'Registro do tempo de execução do TUG, expresso em segundos.',
        'Descrição das condições de realização do TUG, incluindo uso de apoio, assistência e dispositivos auxiliares.',
        'Pontuação individual das 14 tarefas da Escala de Berg.',
        'Pontuação total da Escala de Berg, com máximo de 56 pontos.',
        'Identificação das tarefas com maior dificuldade.',
        'Descrição de alterações observadas durante a marcha e as transferências posturais.',
        'Análise das possíveis repercussões funcionais.',
        'Correlação clínica entre os resultados do TUG e da Escala de Berg.',
        'Identificação e discussão de resultados discrepantes, quando presentes.',
        'Interpretação clínica fundamentada, incluindo as limitações dos métodos.',
        'Conclusão médica especializada, com identificação profissional, CRM, especialidade e assinatura do médico responsável.',
      ]],

      ['k' => 'h', 't' => '8. CONSIDERAÇÕES TÉCNICAS SOBRE O MODELO DE EXAME APRESENTADO'],
      ['k' => 'p', 't' => 'O modelo de avaliação apresentado utiliza conjuntamente o Timed Up and Go (TUG) e a Escala de Equilíbrio de Berg (BBS).'],
      ['k' => 'p', 't' => 'A associação desses instrumentos permite documentar aspectos complementares da mobilidade e do equilíbrio funcional.'],
      ['k' => 'p', 't' => 'O TUG fornece uma medida temporal da execução de uma tarefa de mobilidade, enquanto a Escala de Berg avalia o desempenho em diferentes tarefas posturais.'],
      ['k' => 'p', 't' => 'A interpretação conjunta é relevante, especialmente quando houver divergência entre o tempo de execução do TUG e a pontuação da Escala de Berg.'],
      ['k' => 'p', 't' => 'Nessas situações, recomenda-se verificar a precisão do registro, as condições de execução, a necessidade de auxílio e os possíveis fatores clínicos que possam explicar os resultados.'],

      ['k' => 'h', 't' => '9. CONCLUSÃO E SOLICITAÇÃO MÉDICA'],
      ['k' => 'p', 't' => 'Diante da necessidade de investigação de possíveis alterações do equilíbrio corporal, instabilidade postural, comprometimentos neurológicos e vestibulares e limitações da mobilidade funcional, JUSTIFICO E SOLICITO A REALIZAÇÃO DE AVALIAÇÃO CLÍNICA DO EQUILÍBRIO E RISCO DE QUEDAS, COM APLICAÇÃO DO TESTE TIMED UP AND GO (TUG) E DA ESCALA DE EQUILÍBRIO DE BERG (BBS), acompanhada de laudo médico interpretativo especializado.'],
      ['k' => 'p', 't' => 'Para esta solicitação, prioriza-se a avaliação clínica e a emissão do laudo por médico especialista em NEUROLOGIA, OTORRINOLARINGOLOGIA, ORTOPEDIA E TRAUMATOLOGIA ou MEDICINA FÍSICA E REABILITAÇÃO (FISIATRIA), em razão da finalidade neurológica, vestibular, funcional e médico-pericial.'],
      ['k' => 'p', 't' => 'Ressalto que o relatório técnico de aplicação dos testes e o laudo médico interpretativo possuem finalidades distintas.'],
      ['k' => 'p', 't' => 'A interpretação médica especializada é solicitada para assegurar adequada correlação clínico-neurológica e funcional, maior consistência técnico-científica e subsídios à tomada de decisões diagnósticas, terapêuticas e médico-periciais.'],
      ['k' => 'p', 't' => 'A presente solicitação tem por objetivo assegurar avaliação padronizada e tecnicamente fundamentada do equilíbrio estático e dinâmico, da mobilidade funcional e dos fatores associados ao risco de quedas, com especial atenção às repercussões sobre a capacidade funcional global do paciente.'],
    ],
  ],
];

/** IDs de exame que disparan un documento especial TCPDF (ver orders/signed-pdf.php). */
function specializedExamDocIds(): array {
    global $SPECIALIZED_EXAM_DOCS;
    return array_keys($SPECIALIZED_EXAM_DOCS);
}

/** ISO `YYYY-MM-DD` → "19 de outubro de 2026". */
function formatDateLongPT(?string $iso): string {
    static $months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    if (!$iso || !preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $iso, $m)) return (string) $iso;
    $day   = (int) $m[3];
    $month = $months[((int) $m[2]) - 1] ?? $m[2];
    return "{$day} de {$month} de {$m[1]}";
}

/**
 * Escribe UN documento especializado completo (título, caja de paciente,
 * secciones numeradas, firma) en $pdf, empezando una hoja nueva. Usa
 * SetAutoPageBreak nativo de TCPDF (no hace falta medir nada a mano, a
 * diferencia de PrintSpecializedExamTemplate.tsx) y deja la firma
 * ("Assinado digitalmente...", vía drawSignatureFooter) SOLO en la última
 * hoja de ESTE documento — igual que hace Laudos. Agrega el encabezado de
 * continuidad (Paciente + Página X de Y, numeración LOCAL a este documento)
 * en un post-pass sobre su propio rango de páginas.
 */
function renderSpecializedExamDocument(
    TCPDF $pdf,
    string $examId,
    string $patientName,
    string $dateIso,
    array $sig,
    ?string $qrContent,
    ?string $token,
    ?string $accessCode
): void {
    global $SPECIALIZED_EXAM_DOCS;
    $def = $SPECIALIZED_EXAM_DOCS[$examId] ?? null;
    if (!$def) return;

    $INK = '#111827';
    $MUTED = '#6B7280';
    $LINE = '#E2E8F0';
    $esc = fn($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
    $leftMargin = 18;
    $rightMargin = 18;

    $pdf->SetMargins($leftMargin, 20, $rightMargin);
    $pdf->SetAutoPageBreak(true, 20);
    $pdf->AddPage();
    $startPage = $pdf->getPage();

    $pageWidth = $pdf->getPageWidth();
    $contentW = $pageWidth - $leftMargin - $rightMargin;

    $pdf->SetFont('freesans', '', 9);
    $pdf->writeHTML('<p style="text-align:center;font-size:13pt;font-weight:bold;letter-spacing:0.5pt;color:' . $INK . ';margin:0;">RELATÓRIO MÉDICO E JUSTIFICATIVA DE EXAME ESPECIALIZADO</p>', true, false, true, false, '');
    $pdf->SetY($pdf->GetY() + 2);
    $pdf->writeHTML('<p style="text-align:center;font-size:11pt;font-weight:bold;color:' . $INK . ';margin:0;">' . $esc($def['examTitle']) . '</p>', true, false, true, false, '');
    if (!empty($def['examTitle2'])) {
        $pdf->SetY($pdf->GetY() + 0.5);
        $pdf->writeHTML('<p style="text-align:center;font-size:9pt;font-weight:bold;color:' . $MUTED . ';margin:0;">' . $esc($def['examTitle2']) . '</p>', true, false, true, false, '');
    }
    $pdf->SetY($pdf->GetY() + 3);
    $pdf->writeHTML('<hr style="border-top:0.3mm solid ' . $LINE . ';" />', true, false, true, false, '');
    $pdf->SetY($pdf->GetY() + 4);

    // Caja de paciente — mismo look que Laudos (RoundedRect + writeHTML
    // adentro), pero el alto NO es fijo: "Finalidade" cambia de largo según
    // el documento (algunas envuelven a 2 líneas) y un alto fijo dejaba el
    // texto saliéndose del recuadro. Se mide primero en una transacción
    // (se descarta, nunca se dibuja) y recién con el alto real se traza el
    // RoundedRect y se escribe el contenido de verdad.
    $formattedDate = formatDateLongPT($dateIso);
    $boxY = $pdf->GetY();
    $boxPad = 4;
    $htmlBox = '<p style="font-size:9pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Finalidade:</b> ' . $esc($def['finalidade']) . '</p>'
        . '<p style="font-size:9pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Paciente:</b> ' . $esc(mb_strtoupper($patientName)) . '</p>'
        . '<p style="font-size:9pt;color:' . $INK . ';margin:0;"><b>Data:</b> ' . $esc($formattedDate) . '</p>';

    $pdf->startTransaction();
    $pdf->SetXY($leftMargin + $boxPad, $boxY + $boxPad - 1.5);
    $pdf->SetRightMargin($rightMargin + $boxPad);
    $pdf->writeHTML($htmlBox, true, false, true, false, '');
    $measuredBottom = $pdf->GetY();
    $pdf->SetRightMargin($rightMargin);
    $pdf->rollbackTransaction(true);
    $boxH = max(18, ($measuredBottom - $boxY) + ($boxPad - 1.5) + 2.5);

    $pdf->SetDrawColor(226, 232, 240);
    $pdf->SetLineWidth(0.25);
    $pdf->RoundedRect($leftMargin, $boxY, $contentW, $boxH, 1.5, '1111', 'D');
    $pdf->SetXY($leftMargin + $boxPad, $boxY + $boxPad - 1.5);
    $pdf->SetRightMargin($rightMargin + $boxPad);
    $pdf->writeHTML($htmlBox, true, false, true, false, '');
    $pdf->SetRightMargin($rightMargin);
    $pdf->SetY($boxY + $boxH + 5);

    if (!empty($def['examSolicitado'])) {
        $pdf->writeHTML('<p style="font-size:9pt;line-height:1.5;color:' . $INK . ';margin:0 0 3mm 0;"><b>' . $esc($def['examSolicitadoLabel']) . ':</b> ' . $esc($def['examSolicitado']) . '</p>', true, false, true, false, '');
    }
    if (!empty($def['examSolicitadoList'])) {
        $html = '<p style="font-size:9pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>' . $esc($def['examSolicitadoLabel']) . ':</b></p><ul style="font-size:9pt;line-height:1.4;color:' . $INK . ';margin:0 0 3mm 0;">';
        foreach ($def['examSolicitadoList'] as $it) { $html .= '<li>' . $esc($it) . '</li>'; }
        $html .= '</ul>';
        $pdf->writeHTML($html, true, false, true, false, '');
    }
    if (!empty($def['solicitacaoComplementar'])) {
        $pdf->writeHTML('<p style="font-size:9pt;line-height:1.5;color:' . $INK . ';margin:0 0 3mm 0;"><b>Solicitação complementar:</b> ' . $esc($def['solicitacaoComplementar']) . '</p>', true, false, true, false, '');
    }
    if (!empty($def['specialtyPref'])) {
        $pdf->writeHTML('<p style="font-size:9pt;line-height:1.5;color:' . $INK . ';margin:0 0 3mm 0;">' . $esc($def['specialtyPref']) . '</p>', true, false, true, false, '');
    }

    foreach ($def['body'] as $b) {
        switch ($b['k']) {
            case 'h':
                $pdf->writeHTML('<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:4mm 0 2mm 0;">' . $esc($b['t']) . '</p>', true, false, true, false, '');
                break;
            case 'sh':
                $pdf->writeHTML('<p style="font-size:9pt;font-weight:bold;color:' . $INK . ';margin:2mm 0 1mm 0;">' . $esc($b['t']) . '</p>', true, false, true, false, '');
                break;
            case 'p':
                $pdf->writeHTML('<p style="font-size:9pt;line-height:1.5;color:' . $INK . ';margin:0 0 2.5mm 0;">' . $esc($b['t']) . '</p>', true, false, true, false, '');
                break;
            case 'ol':
            case 'ul':
                $tag = $b['k'];
                $html = "<{$tag} style=\"font-size:9pt;line-height:1.45;color:{$INK};margin:0 0 2.5mm 0;\">";
                foreach ($b['items'] as $it) { $html .= '<li>' . $esc($it) . '</li>'; }
                $html .= "</{$tag}>";
                $pdf->writeHTML($html, true, false, true, false, '');
                break;
        }
    }

    // Firma — bloque QR + identidad del médico + drawSignatureFooter, con
    // la misma guarda anti-corte de Laudos (transacción: si el bloque no
    // entra antes del margen inferior, se descarta y se redibuja entero en
    // una hoja nueva).
    $htmlDoctor = '<p style="text-align:center;font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Dr. Juan Marcelo Cabello Merida</p>'
        . '<p style="text-align:center;font-size:8pt;color:' . $MUTED . ';margin:0.5mm 0 0 0;">Médico Neurologista Clínico · Médico Neurofisiologista</p>'
        . '<p style="text-align:center;font-size:8pt;color:' . $MUTED . ';margin:0;">Médico concursado em Neurologia · Médico Perito Judicial do Estado de São Paulo</p>';

    $signedAt = date('d/m/Y H:i:s');
    $blockStartPage = $pdf->getPage();
    $pdf->startTransaction();
    $pdf->SetY($pdf->GetY() + 6);
    if ($qrContent && $token) {
        $qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY(), 44, $qrContent, $token, $accessCode);
        $pdf->SetY($qrY + 4);
    }
    $pdf->writeHTML($htmlDoctor, true, false, true, false, '');
    drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], 7.0, 3.0, false, 'CRM-SP 161792', $signedAt);
    if ($pdf->getPage() !== $blockStartPage || $pdf->GetY() > $pdf->getPageHeight() - 20) {
        $pdf->rollbackTransaction(true);
        $pdf->AddPage();
        $pdf->SetY($pdf->GetY() + 2);
        if ($qrContent && $token) {
            $qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY(), 44, $qrContent, $token, $accessCode);
            $pdf->SetY($qrY + 4);
        }
        $pdf->writeHTML($htmlDoctor, true, false, true, false, '');
        drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], 7.0, 3.0, false, 'CRM-SP 161792', $signedAt);
    }

    // Post-pass — igual que Laudos (api/laudos/signed-pdf.php):
    // (a) Encabezado de continuidad (Paciente + Página X de Y) en las
    //     páginas 2+ de ESTE documento — numeración local, no la del PDF
    //     combinado.
    // (b) Pie de firma MINI (QR 13mm + misma línea legal ICP-Brasil a 6pt)
    //     en TODAS las páginas de este documento MENOS la última — esa ya
    //     lleva el bloque completo (QR 44×55 + médico + línea legal) recién
    //     dibujado arriba. Pedido explícito: que cada hoja quede verificable
    //     por separado, no solo la última.
    $endPage = $pdf->getPage();
    $numPages = $endPage - $startPage + 1;
    $hdrPad = $leftMargin;
    $availW = $pageWidth - 2 * $hdrPad;
    $cellW = $availW - 30;

    $crmMini = 'CRM-SP 161792';
    $signerMini = (string) $sig['name'];
    $signerMini .= $sig['document']
        ? ' (' . ($sig['documentLabel'] ?? 'Documento') . ' ' . $sig['document'] . ' - ' . $crmMini . ')'
        : ' (' . ' - ' . $crmMini . ')';
    $miniLegalText = $qrContent
        ? 'Assinado digitalmente conforme ICP-Brasil (MP 2.200-2/2001) por ' . $signerMini . ' em ' . $signedAt . '. '
            . 'Verifique a autenticidade e integridade do documento em validar.iti.gov.br.'
        : null;
    $bandTop = 279;
    $bandH   = 14;
    $qrMini  = 13;
    $miniX   = $leftMargin + $qrMini + 3;
    $miniW   = $pageWidth - $rightMargin - $miniX;
    $lineH   = 2.6;

    for ($p = $startPage; $p <= $endPage; $p++) {
        $pdf->setPage($p);
        $pdf->setAutoPageBreak(false, 0);

        if ($p > $startPage) {
            $fullText = 'Paciente: ' . mb_strtoupper($patientName);
            $pdf->SetFont('freesans', '', 8);
            if ($pdf->GetStringWidth($fullText) > $cellW) {
                while ($fullText !== '' && $pdf->GetStringWidth($fullText) > $cellW) {
                    $fullText = preg_replace('/.$/u', '', $fullText);
                }
                $fullText = rtrim($fullText) . '…';
            }
            $pdf->SetTextColor(107, 114, 128);
            $pdf->SetXY($hdrPad, 8);
            $pdf->Cell($cellW, 4, $fullText, 0, 0, 'L');

            $pdf->SetFont('freesans', '', 7.5);
            $pdf->SetTextColor(156, 163, 175);
            $pdf->SetXY($pageWidth - $hdrPad, 8);
            $pdf->Cell(0, 4, 'Página ' . ($p - $startPage + 1) . ' de ' . $numPages, 0, 1, 'R');

            $pdf->SetDrawColor(226, 232, 240);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($hdrPad, 15, $pageWidth - $hdrPad, 15);
        }

        if ($p < $endPage && $qrContent && $token && $miniLegalText) {
            $pdf->SetDrawColor(226, 232, 240);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($leftMargin, $bandTop - 0.5, $pageWidth - $rightMargin, $bandTop - 0.5);

            $pdf->write2DBarcode($qrContent, 'QRCODE,H', $leftMargin, $bandTop + ($bandH - $qrMini) / 2, $qrMini, $qrMini, [], 'N');

            $pdf->SetFont('freesans', '', 6);
            $pdf->SetTextColor(107, 114, 128);
            $miniLines = max(1, $pdf->getNumLines($miniLegalText, $miniW));
            $miniY = $bandTop + max(0, ($bandH - $miniLines * $lineH) / 2);
            $pdf->MultiCell($miniW, $lineH, $miniLegalText, 0, 'C', false, 1, $miniX, $miniY);
        }
    }

    $pdf->setPage($endPage);
    $pdf->setAutoPageBreak(true, 20);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('freesans', '', 10);
}
