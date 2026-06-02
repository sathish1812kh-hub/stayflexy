import json

nodes = []
edges = []
hyperedges = []

services = [
    'analytics_service',
    'api_gateway',
    'auth_service',
    'booking_service',
    'hotel_service',
    'inventory_service',
    'notification_service',
    'organization_service'
]

shared_entities = {
    'stayflexi_db_secret': 'Secret',
    'stayflexi_redis_secret': 'Secret',
    'stayflexi_jwt_secret': 'Secret',
    'stayflexi_service_secret': 'Secret',
    'stayflexi_config': 'ConfigMap',
    'stayflexi_service_account': 'ServiceAccount'
}

for entity_id, entity_type in shared_entities.items():
    nodes.append({
        'id': f'k8s_shared_{entity_id}',
        'label': f'{entity_type} {entity_id.replace("_", "-")}',
        'file_type': 'code',
        'source_file': None,
        'source_location': None,
        'source_url': None,
        'captured_at': None,
        'author': None,
        'contributor': None
    })

nodes.append({
    'id': 'k8s_job_prisma_migrate',
    'label': 'Job prisma-migrate',
    'file_type': 'code',
    'source_file': 'infrastructure/kubernetes/jobs/prisma-migrate.yaml',
    'source_location': None,
    'source_url': None,
    'captured_at': None,
    'author': None,
    'contributor': None
})

edges.append({
    'source': 'k8s_job_prisma_migrate',
    'target': 'k8s_shared_stayflexi_db_secret',
    'relation': 'references',
    'confidence': 'EXTRACTED',
    'confidence_score': 1.0,
    'source_file': 'infrastructure/kubernetes/jobs/prisma-migrate.yaml',
    'source_location': None,
    'weight': 1.0
})
edges.append({
    'source': 'k8s_job_prisma_migrate',
    'target': 'k8s_shared_stayflexi_service_account',
    'relation': 'references',
    'confidence': 'EXTRACTED',
    'confidence_score': 1.0,
    'source_file': 'infrastructure/kubernetes/jobs/prisma-migrate.yaml',
    'source_location': None,
    'weight': 1.0
})

for s in services:
    s_hyphen = s.replace('_', '-')
    base_dir = f'infrastructure/kubernetes/services/{s_hyphen}'
    
    nodes.append({
        'id': f'k8s_deploy_{s}',
        'label': f'Deployment {s_hyphen}',
        'file_type': 'code',
        'source_file': f'{base_dir}/deployment.yaml',
        'source_location': None,
        'source_url': None,
        'captured_at': None,
        'author': None,
        'contributor': None
    })
    nodes.append({
        'id': f'k8s_hpa_{s}',
        'label': f'HPA {s_hyphen}-hpa',
        'file_type': 'code',
        'source_file': f'{base_dir}/hpa.yaml',
        'source_location': None,
        'source_url': None,
        'captured_at': None,
        'author': None,
        'contributor': None
    })
    nodes.append({
        'id': f'k8s_svc_{s}',
        'label': f'Service {s_hyphen}',
        'file_type': 'code',
        'source_file': f'{base_dir}/service.yaml',
        'source_location': None,
        'source_url': None,
        'captured_at': None,
        'author': None,
        'contributor': None
    })

    # Edges HPA -> Deploy
    edges.append({
        'source': f'k8s_hpa_{s}',
        'target': f'k8s_deploy_{s}',
        'relation': 'references',
        'confidence': 'EXTRACTED',
        'confidence_score': 1.0,
        'source_file': f'{base_dir}/hpa.yaml',
        'source_location': None,
        'weight': 1.0
    })
    
    # Edges SVC -> Deploy
    edges.append({
        'source': f'k8s_svc_{s}',
        'target': f'k8s_deploy_{s}',
        'relation': 'references',
        'confidence': 'EXTRACTED',
        'confidence_score': 1.0,
        'source_file': f'{base_dir}/service.yaml',
        'source_location': None,
        'weight': 1.0
    })

    # Edges Deploy -> Shared
    for entity_id in shared_entities.keys():
        edges.append({
            'source': f'k8s_deploy_{s}',
            'target': f'k8s_shared_{entity_id}',
            'relation': 'references',
            'confidence': 'EXTRACTED',
            'confidence_score': 1.0,
            'source_file': f'{base_dir}/deployment.yaml',
            'source_location': None,
            'weight': 1.0
        })

# api-gateway references other services
gateway_deps = ['auth_service', 'organization_service', 'hotel_service', 'inventory_service', 'booking_service', 'analytics_service', 'notification_service']
for dep in gateway_deps:
    edges.append({
        'source': 'k8s_deploy_api_gateway',
        'target': f'k8s_svc_{dep}',
        'relation': 'references',
        'confidence': 'INFERRED',
        'confidence_score': 0.9,
        'source_file': 'infrastructure/kubernetes/services/api-gateway/deployment.yaml',
        'source_location': None,
        'weight': 1.0
    })

hyperedges.append({
    'id': 'stayflexi_backend_workloads',
    'label': 'Stayflexi Backend Workloads',
    'nodes': [f'k8s_deploy_{s}' for s in services],
    'relation': 'participate_in',
    'confidence': 'INFERRED',
    'confidence_score': 0.9,
    'source_file': None
})

output = {
    'nodes': nodes,
    'edges': edges,
    'hyperedges': hyperedges,
    'input_tokens': 0,
    'output_tokens': 0
}

with open('C:/Stayflexi/graphify-out/.graphify_chunk_04.json', 'w') as f:
    json.dump(output, f)
