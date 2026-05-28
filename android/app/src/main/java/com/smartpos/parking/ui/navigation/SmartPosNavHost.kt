package com.smartpos.parking.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smartpos.parking.SmartPosApp
import com.smartpos.parking.ui.screens.login.LoginScreen
import com.smartpos.parking.ui.screens.login.LoginViewModel
import com.smartpos.parking.ui.screens.valet.DeliverScreen
import com.smartpos.parking.ui.screens.valet.DeliverViewModel
import com.smartpos.parking.ui.screens.valet.ReceiveVehicleScreen
import com.smartpos.parking.ui.screens.valet.ReceiveVehicleViewModel
import com.smartpos.parking.ui.screens.valet.TicketDetailScreen
import com.smartpos.parking.ui.screens.valet.TicketDetailViewModel
import com.smartpos.parking.ui.screens.valet.ValetQueueScreen
import com.smartpos.parking.ui.screens.valet.ValetQueueViewModel
import com.smartpos.parking.ui.theme.GoldPrimary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun SmartPosNavHost(app: SmartPosApp) {
    val repository = app.repository
    val authRepository = app.authRepository
    val navController = rememberNavController()
    var ready by remember { mutableStateOf(false) }
    var startDestination by remember { mutableStateOf(Routes.LOGIN) }

    LaunchedEffect(Unit) {
        val loggedIn = withContext(Dispatchers.IO) { authRepository.restoreSession() }
        startDestination = if (loggedIn) Routes.VALET else Routes.LOGIN
        ready = true
    }

    val isLoggedIn by authRepository.isLoggedIn.collectAsState()

    LaunchedEffect(isLoggedIn, ready) {
        if (!ready) return@LaunchedEffect
        if (!isLoggedIn) {
            navController.navigate(Routes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    if (!ready) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = GoldPrimary)
        }
        return
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            val vm: LoginViewModel = viewModel(factory = LoginViewModel.factory(authRepository))
            LoginScreen(
                viewModel = vm,
                onLoggedIn = {
                    navController.navigate(Routes.VALET) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.VALET) {
            val vm: ValetQueueViewModel = viewModel(
                factory = ValetQueueViewModel.factory(
                    repository,
                    authRepository,
                    app.valetRealtimeClient
                )
            )
            ValetQueueScreen(
                viewModel = vm,
                onTicketClick = { ticketId ->
                    navController.navigate(Routes.ticketDetail(ticketId))
                },
                onReceiveVehicle = { navController.navigate(Routes.RECEIVE) }
            )
        }

        composable(Routes.RECEIVE) {
            val vm: ReceiveVehicleViewModel = viewModel(
                factory = ReceiveVehicleViewModel.factory(repository)
            )
            ReceiveVehicleScreen(
                viewModel = vm,
                onBack = { navController.popBackStack() },
                onSuccess = {
                    navController.popBackStack(Routes.VALET, inclusive = false)
                }
            )
        }

        composable(
            route = Routes.TICKET_DETAIL,
            arguments = listOf(navArgument("ticketId") { type = NavType.StringType })
        ) { entry ->
            val ticketId = entry.arguments?.getString("ticketId") ?: return@composable
            val vm: TicketDetailViewModel = viewModel(
                factory = TicketDetailViewModel.factory(repository, ticketId)
            )
            TicketDetailScreen(
                viewModel = vm,
                onBack = { navController.popBackStack() },
                onDeliver = { id -> navController.navigate(Routes.deliver(id)) }
            )
        }

        composable(
            route = Routes.DELIVER,
            arguments = listOf(navArgument("ticketId") { type = NavType.StringType })
        ) { entry ->
            val ticketId = entry.arguments?.getString("ticketId") ?: return@composable
            val vm: DeliverViewModel = viewModel(
                factory = DeliverViewModel.factory(repository, app.paymentGateway, ticketId)
            )
            DeliverScreen(
                viewModel = vm,
                onBack = { navController.popBackStack() },
                onFinished = {
                    navController.popBackStack(Routes.VALET, inclusive = false)
                }
            )
        }
    }
}
