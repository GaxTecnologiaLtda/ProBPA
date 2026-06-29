# MÓDULO: Imunização (MIV) e Vacinas
# Foco: Componente 2 (Pólio e Penta), Componente 6/7 Novos Eixos (HPV, Influenza)

QUERY_VACINAS_APLICADAS = """
SELECT 
    fat_vac.co_fat_cidadao_pec AS cns_cpf_paciente,
    fat_vac.co_dim_tempo AS data_aplicacao,
    eq.nu_ine AS ine,
    us.nu_cnes AS cnes,
    prof.no_profissional AS nome_profissional,
    cbo.nu_cbo AS cbo,
    dim_imuno.nu_identificador AS imunobiologico_codigo, -- Ex: 42 (Penta), 22 (VIP)
    dim_dose.nu_identificador AS dose_codigo -- Ex: 1 (D1), 2 (D2), 3 (D3)
FROM tb_fat_vacinacao_vacina fat_vac_detalhe
JOIN tb_fat_vacinacao fat_vac ON fat_vac_detalhe.co_fat_vacinacao = fat_vac.co_seq_fat_vacinacao
JOIN tb_dim_equipe eq ON fat_vac.co_dim_equipe = eq.co_seq_dim_equipe
JOIN tb_dim_unidade_saude us ON fat_vac.co_dim_unidade_saude = us.co_seq_dim_unidade_saude
JOIN tb_dim_profissional prof ON fat_vac.co_dim_profissional = prof.co_seq_dim_profissional
JOIN tb_dim_cbo cbo ON fat_vac.co_dim_cbo = cbo.co_seq_dim_cbo
JOIN tb_dim_imunobiologico dim_imuno ON fat_vac_detalhe.co_dim_imunobiologico = dim_imuno.co_seq_dim_imunobiologico
JOIN tb_dim_dose_imunobiologico dim_dose ON fat_vac_detalhe.co_dim_dose_imunobiologico = dim_dose.co_seq_dim_dose_imunobiologico
WHERE fat_vac.co_dim_tempo >= %(data_inicio)s 
  AND fat_vac.co_dim_tempo <= %(data_fim)s
"""
