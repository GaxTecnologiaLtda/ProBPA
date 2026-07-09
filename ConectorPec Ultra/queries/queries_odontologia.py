# MÓDULO: Saúde Bucal (Odontologia - eSB)
# Foco: Componente C5 (Gestantes - Odonto) e Novos Eixos Odontológicos (B1 a B6)

QUERY_ATENDIMENTO_ODONTO = """
SELECT 
    fat_od.co_seq_fat_atendimento_odonto AS id_atendimento_odonto,
    fat_od.co_fat_cidadao_pec AS id_paciente,
    fat_od.co_dim_tempo AS data_atendimento,
    cbo.nu_cbo AS cbo,
    eq.nu_ine AS ine,
    us.nu_cnes AS cnes,
    dim_tipo.nu_identificador AS tipo_consulta_odonto, -- 1=Primeira consulta, 3=Tratamento Concluído
    dim_local.nu_identificador AS local_atendimento
FROM tb_fat_atendimento_odonto fat_od
JOIN tb_dim_cbo cbo ON fat_od.co_dim_cbo = cbo.co_seq_dim_cbo
LEFT JOIN tb_dim_equipe eq ON fat_od.co_dim_equipe = eq.co_seq_dim_equipe
JOIN tb_dim_unidade_saude us ON fat_od.co_dim_unidade_saude = us.co_seq_dim_unidade_saude
LEFT JOIN tb_dim_tipo_consulta_odonto dim_tipo ON fat_od.co_dim_tipo_consulta_odonto = dim_tipo.co_seq_dim_tipo_cnsulta_odonto
LEFT JOIN tb_dim_local_atendimento dim_local ON fat_od.co_dim_local_atendimento = dim_local.co_seq_dim_local_atendimento
WHERE fat_od.co_dim_tempo >= %(data_inicio)s 
  AND fat_od.co_dim_tempo <= %(data_fim)s
"""
