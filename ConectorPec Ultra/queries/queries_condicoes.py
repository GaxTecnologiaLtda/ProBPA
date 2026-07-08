# MÓDULO: Rastreio de Condições e Antecedentes Clínicos
# Foco: C3 (Hipertensão), C4 (Diabetes) e C5 (Gestantes)

QUERY_CONDICOES_CLINICAS = """
SELECT 
    prob.co_fat_cidadao_pec AS cns_cpf_paciente,
    prob.co_dim_tempo AS data_registro,
    ciap.nu_ciap AS codigo_ciap,
    cid.nu_cid AS codigo_cid,
    sit.nu_identificador AS situacao_condicao -- Ex: Ativo (0)
FROM tb_fat_atd_ind_problemas prob
LEFT JOIN tb_dim_ciap ciap ON prob.co_dim_ciap = ciap.co_seq_dim_ciap
LEFT JOIN tb_dim_cid cid ON prob.co_dim_cid = cid.co_seq_dim_cid
LEFT JOIN tb_dim_situacao_problema sit ON prob.co_dim_situacao_problema = sit.co_seq_dim_situacao
WHERE prob.co_dim_tempo >= %(data_inicio)s 
  AND prob.co_dim_tempo <= %(data_fim)s
  -- Opcional: E aqui a aplicação pode cruzar isso para saber se a condição está ativa no quadrimestre
"""

QUERY_ANTECEDENTES_OBSTETRICOS = """
SELECT 
    cidadao.co_seq_cidadao AS id_paciente,
    ant.ds_gestacao AS gestante_ativa,
    ant.dt_ultimo_parto AS data_ultimo_parto,
    ant.co_desfecho_ultima_gestacao AS desfecho
FROM tb_antecedente ant
JOIN tb_prontuario pron ON ant.co_prontuario = pron.co_seq_prontuario
JOIN tb_cidadao cidadao ON pron.co_cidadao = cidadao.co_seq_cidadao
"""
