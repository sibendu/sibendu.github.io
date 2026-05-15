---
title: Knative on OCI OKE
description: A concise serverless-on-Kubernetes exploration using Knative with Oracle Container Engine for Kubernetes.
date: 2019-10-20
tags: [Knative, Kubernetes, OCI, Serverless]
featured: false
---

This article is adapted from my LinkedIn article: [Knative on OCI OKE](https://www.linkedin.com/pulse/knative-oci-oke-sibendu-das/).

Sunday morning serverless. I needed a quick serverless function, but I also wanted to stay close to Kubernetes.

That is where Knative becomes interesting. It brings serverless-style developer experience onto Kubernetes, allowing workloads to scale based on demand while still running on a Kubernetes foundation. On Oracle Cloud Infrastructure, Oracle Container Engine for Kubernetes provides the managed Kubernetes layer, and Knative can sit above it to simplify serving workloads.

## Why Knative

Serverless is attractive because it reduces the operational surface for application teams. Developers want to deploy code and have the platform handle routing, autoscaling, revisions, and scale-to-zero behavior.

Kubernetes is attractive because it provides a portable control plane for containerized workloads. But plain Kubernetes can feel too low-level when the goal is simply to expose an event-driven or request-driven service.

Knative helps bridge that gap.

## The architecture idea

The basic stack is straightforward:

- OCI provides cloud infrastructure.
- OKE provides managed Kubernetes.
- Knative adds serverless workload serving on top of Kubernetes.
- Containerized functions or services are deployed as Knative services.
- The platform handles routing, revision management, and scaling behavior.

This keeps the workload container-native while improving the deployment and scaling model for smaller services and functions.

## What makes it useful

Knative is useful when teams want serverless behavior without completely leaving the Kubernetes ecosystem. It supports a model where applications can be packaged as containers, deployed declaratively, and scaled based on demand.

That helps in several situations:

- Lightweight APIs
- Event handlers
- Internal automation functions
- Spiky workloads
- Experiments and prototypes
- Teams standardizing on Kubernetes but wanting simpler service deployment

## OCI and OKE fit

OKE provides the Kubernetes base, while OCI gives the surrounding cloud services needed for networking, registry, identity, observability, and infrastructure management.

The value is in combining managed infrastructure with a higher-level application abstraction. Teams still need to understand Kubernetes, but they can avoid repeating every operational detail for each small service.

## Practical cautions

Knative reduces some complexity but does not remove platform engineering. Teams still need to make decisions about ingress, certificates, container image management, monitoring, logging, resource limits, security, and operational support.

Serverless on Kubernetes is still architecture. It needs the same production thinking as any other platform choice.

## The takeaway

Knative on OKE is a useful pattern when the organization wants Kubernetes portability with a serverless-style deployment model.

It is not only about running a function. It is about choosing the right abstraction level for teams that need speed, scale, and operational consistency without abandoning the Kubernetes foundation they already trust.
