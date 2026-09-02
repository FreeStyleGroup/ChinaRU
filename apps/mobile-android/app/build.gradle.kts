import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

/**
 * Ключ подписи.
 *
 * RuStore не хранит ключи разработчика и не выдаёт их: потерянный ключ
 * означает, что обновить приложение уже нельзя — только выпустить новое
 * с другим именем пакета. Поэтому keystore и пароли лежат вне репозитория,
 * в keystore.properties, а сюда приходят чтением файла.
 *
 * Файла нет — собирается только debug. Это осознанно: сборка release
 * с отладочной подписью выглядит рабочей ровно до попытки загрузить её
 * в консоль.
 */
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}
val hasKeystore = keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "com.chinaru.app"
    compileSdk = 37

    defaultConfig {
        /* Имя пакета менять нельзя после первой публикации: в RuStore
           приложение опознаётся именно по нему. */
        applicationId = "com.chinaru.app"
        /* 26, а не 24: адаптивная иконка появилась в Android 8, и на более
           старых нужны растровые mipmap каждого размера. Доля Android 7
           в России уже меньше процента — рисовать и тащить ради неё
           отдельный набор иконок не за что. */
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
    }

    signingConfigs {
        if (hasKeystore) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }

            /* Адрес API объявлен ровно здесь и приходит в код константой.
               Первая версия работает с текущим сайтом на Битриксе; когда
               заработает Node, переезд сводится к правке этой строки —
               при условии, что форма ответов у обоих одинаковая. Ради
               этого условия эндпоинты на Битриксе и пишутся сразу под
               будущий контракт, а не «как удобнее сейчас». */
            buildConfigField("String", "API_BASE_URL", "\"https://chinaru.ru/local/api/v1/\"")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"

            buildConfigField("String", "API_BASE_URL", "\"https://chinaru.ru/local/api/v1/\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)

    debugImplementation(libs.androidx.ui.tooling)
}
