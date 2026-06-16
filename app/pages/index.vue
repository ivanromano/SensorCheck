<template>
  <IonPage>
    <IonHeader translucent>
      <IonToolbar>
        <IonTitle>SensorCheck</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">SensorCheck</IonTitle>
        </IonToolbar>
      </IonHeader>

      <main class="page">
        <section class="hero">
          <IonIcon :icon="phonePortraitOutline" class="hero-icon" />

          <h1>Comprobador de sensores</h1>

          <p>
            Revisa rápidamente los sensores principales del dispositivo antes de continuar.
          </p>

          <IonButton expand="block" size="large" @click="startSensorCheck">
            Iniciar comprobación
          </IonButton>
        </section>

        <IonList inset>
          <IonItem>
            <IonIcon slot="start" :icon="speedometerOutline" />
            <IonLabel>
              <h2>Acelerómetro</h2>
              <p>{{ accelerometerStatus }}</p>
            </IonLabel>
            <IonBadge :color="accelerometerBadgeColor">
              {{ accelerometerBadgeText }}
            </IonBadge>
          </IonItem>

          <IonItem>
            <IonIcon slot="start" :icon="compassOutline" />
            <IonLabel>
              <h2>Giroscopio</h2>
              <p>{{ gyroscopeStatus }}</p>
            </IonLabel>
            <IonBadge :color="gyroscopeBadgeColor">
              {{ gyroscopeBadgeText }}
            </IonBadge>
          </IonItem>

          <IonItem>
            <IonIcon slot="start" :icon="locationOutline" />
            <IonLabel>
              <h2>Ubicación</h2>
              <p>{{ locationStatus }}</p>
            </IonLabel>
            <IonBadge :color="locationBadgeColor">
              {{ locationBadgeText }}
            </IonBadge>
          </IonItem>

          <IonItem>
            <IonIcon slot="start" :icon="batteryChargingOutline" />
            <IonLabel>
              <h2>Batería</h2>
              <p>{{ batteryStatus }}</p>
            </IonLabel>
            <IonBadge :color="batteryBadgeColor">
              {{ batteryBadgeText }}
            </IonBadge>
          </IonItem>
        </IonList>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Resultado</IonCardTitle>
            <IonCardSubtitle>Estado general del dispositivo</IonCardSubtitle>
          </IonCardHeader>

          <IonCardContent>
            {{ generalResult }}
          </IonCardContent>
        </IonCard>
      </main>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue'

import {
  phonePortraitOutline,
  speedometerOutline,
  compassOutline,
  locationOutline,
  batteryChargingOutline
} from 'ionicons/icons'

import { ref, type Ref } from 'vue'

const accelerometerStatus: Ref<string> = ref('Pendiente de comprobación')
const gyroscopeStatus: Ref<string> = ref('Pendiente de comprobación')
const locationStatus: Ref<string> = ref('Pendiente de comprobación')
const batteryStatus: Ref<string> = ref('Pendiente de comprobación')

const accelerometerBadgeText: Ref<string> = ref('Pendiente')
const gyroscopeBadgeText: Ref<string> = ref('Pendiente')
const locationBadgeText: Ref<string> = ref('Pendiente')
const batteryBadgeText: Ref<string> = ref('Pendiente')

const accelerometerBadgeColor: Ref<string> = ref('medium')
const gyroscopeBadgeColor: Ref<string> = ref('medium')
const locationBadgeColor: Ref<string> = ref('medium')
const batteryBadgeColor: Ref<string> = ref('medium')

const generalResult: Ref<string> = ref('Todavía no se ejecutó ninguna comprobación.')

function markSensorAsAvailable(
  status: Ref<string>,
  badgeText: Ref<string>,
  badgeColor: Ref<string>,
  message: string
): void {
  status.value = message
  badgeText.value = 'OK'
  badgeColor.value = 'success'
}

function startSensorCheck(): void {
  markSensorAsAvailable(
    accelerometerStatus,
    accelerometerBadgeText,
    accelerometerBadgeColor,
    'Interfaz preparada para lectura del acelerómetro.'
  )

  markSensorAsAvailable(
    gyroscopeStatus,
    gyroscopeBadgeText,
    gyroscopeBadgeColor,
    'Interfaz preparada para lectura del giroscopio.'
  )

  markSensorAsAvailable(
    locationStatus,
    locationBadgeText,
    locationBadgeColor,
    'Interfaz preparada para permisos de ubicación.'
  )

  markSensorAsAvailable(
    batteryStatus,
    batteryBadgeText,
    batteryBadgeColor,
    'Interfaz preparada para lectura de batería.'
  )

  generalResult.value = 'La interfaz Ionic está funcionando correctamente. Falta conectar las APIs reales de sensores.'
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px;
  color: #111827;
  background:
    radial-gradient(circle at top, rgba(56, 128, 255, 0.18), transparent 32%),
    #f8fafc;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 12px 18px;
  text-align: center;
}

.hero-icon {
  width: 74px;
  height: 74px;
  color: var(--ion-color-primary);
}

.hero h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
}

.hero p {
  max-width: 420px;
  margin: 0 0 8px;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

ion-content {
  --background: #f8fafc;
}

ion-list {
  margin-top: 18px;
}

ion-card {
  margin-top: 22px;
}
</style>
