package com.chinaru.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chinaru.ui.theme.*
import com.chinaru.ui.viewmodels.ProductUiState
import com.chinaru.ui.viewmodels.ProductViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductScreen(
    productId: Int, 
    onBackClick: () -> Unit,
    viewModel: ProductViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Запускаем загрузку товара при первом открытии экрана с новым productId
    LaunchedEffect(productId) {
        viewModel.loadProduct(productId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Товар #$productId", fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    IconButton(onClick = { /* TODO: Поделиться */ }) {
                        Icon(Icons.Default.Share, contentDescription = "Поделиться")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceWhite,
                    titleContentColor = TextMain,
                    navigationIconContentColor = TextMain,
                    actionIconContentColor = TextMain
                )
            )
        },
        bottomBar = { 
            // Показываем кнопки "В корзину" и "Купить", только если данные загрузились
            if (uiState is ProductUiState.Success) {
                ProductBottomBar() 
            }
        },
        containerColor = BackgroundGray
    ) { paddingValues ->
        when (val state = uiState) {
            is ProductUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PrimaryRed)
                }
            }
            is ProductUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = state.message, color = TextMain)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadProduct(productId) },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryRed)
                        ) {
                            Text("Повторить", color = SurfaceWhite)
                        }
                    }
                }
            }
            is ProductUiState.Success -> {
                val product = state.product
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Заглушка для галереи фотографий товара
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .background(Color(0xFFEAEAEA)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Фото товара ${product.id}", color = TextSecondary, fontSize = 18.sp)
                    }

                    // Основная информация о товаре
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceWhite)
                            .padding(16.dp)
                    ) {
                        Text(
                            text = product.price,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryRed
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = product.name,
                            fontSize = 16.sp,
                            color = TextMain,
                            lineHeight = 22.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        // Рейтинг и отзывы
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = "Рейтинг", tint = Color(0xFFFFC107), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("${product.rating}", fontSize = 14.sp, color = TextMain, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("• ${product.reviewsCount} отзывов", fontSize = 14.sp, color = TextSecondary)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Блок доставки
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceWhite)
                            .padding(16.dp)
                    ) {
                        Text("Доставка", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextMain)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Бесплатная доставка в Россию", fontSize = 14.sp, color = TextMain)
                        Text("Ориентировочно: ${product.deliveryEstimate}", fontSize = 12.sp, color = TextSecondary)
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Блок описания
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceWhite)
                            .padding(16.dp)
                    ) {
                        Text("Описание", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextMain)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = product.description,
                            fontSize = 14.sp,
                            color = TextSecondary,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ProductBottomBar() {
    Surface(color = SurfaceWhite, shadowElevation = 16.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Кнопка перехода в магазин/корзину (иконка)
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(end = 8.dp)) {
                Icon(Icons.Default.ShoppingCart, contentDescription = "Корзина", tint = TextMain)
                Text("Корзина", fontSize = 10.sp, color = TextMain)
            }

            // Основные кнопки покупки
            Button(onClick = { }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = LightRed, contentColor = PrimaryRed)) { Text("В корзину", fontWeight = FontWeight.Bold) }
            Button(onClick = { }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = PrimaryRed, contentColor = SurfaceWhite)) { Text("Купить", fontWeight = FontWeight.Bold) }
        }
    }
}