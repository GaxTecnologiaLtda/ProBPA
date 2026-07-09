# MÓDULO: Cadastros Individuais e Domiciliares
# Foco: Base de pacientes (Denominador Universal), Vínculo de Equipe e CNES

QUERY_CIDADANIA_BASE = """
SELECT
    cid.co_seq_cidadao AS id_paciente,
    cid.no_cidadao AS nome_paciente,
    cid.nu_cpf AS cpf,
    cid.nu_cns AS cns,
    cid.dt_nascimento AS data_nascimento,
    cid.no_mae AS nome_mae,
    fat_cid.co_dim_sexo AS sexo,
    fat_cid.nu_micro_area AS micro_area,
    dim_eq.nu_ine AS ine,
    dim_eq.no_equipe AS nome_equipe,
    dim_us.nu_cnes AS cnes,
    dim_us.no_unidade_saude AS nome_unidade_saude,
    dim_prof.no_profissional AS nome_profissional_vinc
FROM tb_cidadao cid
JOIN tb_fat_cidadao_pec fat_cid ON cid.co_seq_cidadao = fat_cid.co_cidadao
LEFT JOIN tb_dim_equipe dim_eq ON fat_cid.co_dim_equipe_vinc = dim_eq.co_seq_dim_equipe
LEFT JOIN tb_dim_unidade_saude dim_us ON fat_cid.co_dim_unidade_saude_vinc = dim_us.co_seq_dim_unidade_saude
LEFT JOIN tb_dim_profissional dim_prof ON fat_cid.co_dim_profissional_vinc = dim_prof.co_seq_dim_profissional
WHERE fat_cid.st_faleceu = 0
"""

QUERY_CADASTRO_DOMICILIAR = """
SELECT 
    fat_dom.co_seq_fat_cad_domiciliar AS id_cadastro_domiciliar,
    fat_dom.co_dim_tempo AS data_cadastro,
    eq.nu_ine AS ine,
    us.nu_cnes AS cnes,
    fat_dom.nu_micro_area AS micro_area
FROM tb_fat_cad_domiciliar fat_dom
JOIN tb_dim_equipe eq ON fat_dom.co_dim_equipe = eq.co_seq_dim_equipe
JOIN tb_dim_unidade_saude us ON fat_dom.co_dim_unidade_saude = us.co_seq_dim_unidade_saude
WHERE fat_dom.co_dim_tempo >= %(data_inicio)s 
  AND fat_dom.co_dim_tempo <= %(data_fim)s
"""
