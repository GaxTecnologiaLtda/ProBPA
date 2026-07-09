# MÓDULO: Atividade Coletiva (Educação em Saúde na Comunidade)
# Tabelas Alvo: tb_fat_atividade_coletiva (ou tb_cds_ficha_ativ_col)

QUERY_ATIVIDADE_COLETIVA = """
SELECT 
    fat_ac.co_seq_fat_atividade_coletiva AS id_atividade,
    fat_ac.co_dim_tempo AS data_atividade,
    eq.nu_ine AS ine,
    us.nu_cnes AS cnes,
    prof.no_profissional AS profissional_responsavel,
    cbo.nu_cbo AS cbo_responsavel,
    NULL AS tema_atividade,     -- Relaciona-se com tb_cds_ativ_col_tema
    NULL AS pratica_atividade,  -- Relaciona-se com tb_cds_ativ_col_pratica
    NULL AS publico_alvo,        -- Relaciona-se com tb_cds_ativ_col_publico_alvo
    fat_ac.nu_participantes AS total_participantes
FROM tb_fat_atividade_coletiva fat_ac
LEFT JOIN tb_dim_equipe eq ON fat_ac.co_dim_equipe = eq.co_seq_dim_equipe
LEFT JOIN tb_dim_unidade_saude us ON fat_ac.co_dim_unidade_saude = us.co_seq_dim_unidade_saude
LEFT JOIN tb_dim_profissional prof ON fat_ac.co_dim_profissional = prof.co_seq_dim_profissional
LEFT JOIN tb_dim_cbo cbo ON fat_ac.co_dim_cbo = cbo.co_seq_dim_cbo

WHERE fat_ac.co_dim_tempo >= %(data_inicio)s 
  AND fat_ac.co_dim_tempo <= %(data_fim)s
"""
